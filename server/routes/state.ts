import { Router } from "express";
import crypto from "crypto";
import { getState, saveState, defaultState, hashPasswordSync, encryptKey, verifyPassword } from "../db/stateManager.js";
import { Developer } from "../db/models.js";
import { hashGeminiApiKey, hasStoredGeminiApiKey, repairGeminiKeySettings } from "./geminiKeyState.js";
import { canDeleteDeveloper, canSetHeadPrivilege, hasAtLeastOneHead } from "./teamPermissions.js";
import { getWorkspaceIdForDev } from "./workspaceAccess.js";
import { getErrorMessage } from "../middlewares/security.js";

const router = Router();

// SECURITY FIX #5: Explicit allowlist of developer fields that may be sent to clients
const CLIENT_SAFE_DEV_FIELDS = [
  "id", "workspaceId", "name", "avatar", "email", "role", "skills",
  "workloadPoints", "velocity", "activeTaskId", "isHead",
  "userId", "contributions", "addedBy", "passwordChangedAt"
] as const;

function buildSafeDevRecord(d: any, currentDevId?: string): any {
  const safe: any = {};
  for (const key of CLIENT_SAFE_DEV_FIELDS) {
    if (key in d) safe[key] = d[key];
  }
  
  // SECURITY FIX: Field-Level Encryption
  // Only expose decrypted personalCredentials to the developer who owns them
  if (currentDevId && d.id === currentDevId && d.personalCredentials) {
    safe.personalCredentials = d.personalCredentials;
  }
  
  return safe;
}

function buildSafeState(dbState: any, currentDevId?: string) {
  const sanitized: any = { ...dbState };
  sanitized.developers = dbState.developers.map((d: any) => buildSafeDevRecord(d, currentDevId));
  sanitized.repositories = Array.isArray(dbState.repositories) ? dbState.repositories : [];

  // SECURITY FIX #2: Determine if the requesting user is a Team Head
  const isHead = currentDevId
    ? dbState.developers.some((d: any) => d.id === currentDevId && d.isHead)
    : false;

  // SECURITY FIX #2: Filter notifications — headOnly notifications (passcode requests)
  // are only visible to Team Heads. Also strip expired passcode notifications.
  const now = Date.now();
  const allNotifications = dbState.settings?.notifications || [];
  const filteredNotifications = allNotifications.filter((n: any) => {
    if (n.headOnly && !isHead) return false;
    if (n.expiresAt && n.expiresAt < now) return false;
    return true;
  });

  sanitized.settings = {
    hasGeminiApiKey: hasStoredGeminiApiKey(dbState.settings),
    notifications: filteredNotifications,
    // SECURITY FIX #2: Never send recoveryPasscodes to clients — they are hashed
    // and only consumed server-side during login verification
  };
  return sanitized;
}

// Obtain complete applet database state (requires token, strips passwords and all sensitive fields via whitelist)
router.get("/", async (req: any, res: any) => {
  try {
    const workspaceId = await getWorkspaceIdForDev(req.userDevId);
    if (typeof workspaceId !== "string") {
      return res.status(400).json({ error: "Invalid workspace ID format." });
    }
    const dbState = await getState(workspaceId);
    dbState.settings = repairGeminiKeySettings(dbState.settings);
    const safeState = buildSafeState(dbState, req.userDevId);
    res.json(safeState);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: getErrorMessage(err, "Failed to fetch state") });
  }
});

// Update applet database state (requires token, merges safely preserving credentials)
router.post("/save", async (req: any, res: any) => {
  const currentDevId = req.userDevId;
  const incomingState = req.body;
  if (!incomingState) {
    return res.status(400).json({ error: "Invalid state payload" });
  }

  try {
    const workspaceId = await getWorkspaceIdForDev(currentDevId);
    if (typeof workspaceId !== "string") {
      return res.status(400).json({ error: "Invalid workspace ID format." });
    }
    const dbState = await getState(workspaceId);
    dbState.settings = repairGeminiKeySettings(dbState.settings);

  // 0. Update settings (only Head can configure Gemini Key)
  if (incomingState.settings) {
    const isHead = dbState.developers.find((d: any) => d.id === currentDevId)?.isHead === true;
    if (incomingState.settings.geminiApiKeyEncrypted !== undefined) {
      if (!isHead) {
        return res.status(403).json({ error: "Access Denied: Only a Project Head can configure the team's Gemini API Key." });
      }

      const rawKey = String(incomingState.settings.geminiApiKeyEncrypted || "").trim();
      const incomingHash = String(incomingState.settings.geminiApiKeyHash || "").trim();

      console.log(`[State SAVE] Gemini key update: rawKeyLen=${rawKey.length}, incomingHash=${incomingHash.substring(0, 8)}...`);

      if (rawKey) {
        dbState.settings.geminiApiKeyHash = incomingHash || hashGeminiApiKey(rawKey);
        dbState.settings.geminiApiKeyEncrypted = encryptKey(rawKey);
        console.log(`[State SAVE] Key encrypted OK: hash=${dbState.settings.geminiApiKeyHash.substring(0, 8)}..., encLen=${dbState.settings.geminiApiKeyEncrypted.length}`);
      } else {
        dbState.settings.geminiApiKeyHash = "";
        dbState.settings.geminiApiKeyEncrypted = "";
        console.log(`[State SAVE] Key CLEARED (empty raw key received)`);
      }
    }
    if (incomingState.settings.notifications !== undefined) {
      dbState.settings.notifications = incomingState.settings.notifications;
    }
    if (incomingState.settings.recoveryPasscodes !== undefined) {
      dbState.settings.recoveryPasscodes = incomingState.settings.recoveryPasscodes;
    }
  }

  // 1. Merge developers
  if (Array.isArray(incomingState.developers)) {
    // Validate unique userIds globally
    for (const d of incomingState.developers) {
      if (d.userId) {
        const cleanUserId = d.userId.trim().toLowerCase();
        const duplicateExists = await Developer.exists({
          userId: cleanUserId,
          id: { $ne: d.id }
        });
        if (duplicateExists) {
          return res.status(400).json({ error: `Username "${d.userId}" is already taken globally.` });
        }
      }
    }

    const updatedDevs: any[] = [];
    const incomingDevsMap = new Map<string, any>();
    for (const d of incomingState.developers) {
      incomingDevsMap.set(d.id, d);
    }

    const isHead = dbState.developers.find((d: any) => d.id === currentDevId)?.isHead === true;

    // Reject deletes unless done by Team Head
    const deletedIds = dbState.developers
      .filter((d: any) => !incomingDevsMap.has(d.id))
      .map((d: any) => d.id);

    if (deletedIds.length > 0 && !isHead) {
      return res.status(403).json({ error: "Access Denied: Only a Team Head can delete profiles." });
    }

    for (const deletedId of deletedIds) {
      const permission = canDeleteDeveloper(dbState.developers, currentDevId, deletedId);
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }
    }

    // Process existing developers
    for (const originalDev of dbState.developers) {
      const incomingDev = incomingDevsMap.get(originalDev.id);
      if (!incomingDev) {
        if (isHead) {
          continue; // Delete is permitted
        } else {
          updatedDevs.push(originalDev);
          continue;
        }
      }

      const mergedDev = { ...originalDev };
      mergedDev.name = typeof incomingDev.name === "string" ? incomingDev.name : originalDev.name;
      mergedDev.role = typeof incomingDev.role === "string" ? incomingDev.role : originalDev.role;
      mergedDev.email = typeof incomingDev.email === "string" ? incomingDev.email : originalDev.email;
      mergedDev.avatar = typeof incomingDev.avatar === "string" ? incomingDev.avatar : originalDev.avatar;

      if (Array.isArray(incomingDev.skills)) {
        mergedDev.skills = incomingDev.skills;
      }
      if (typeof incomingDev.workloadPoints === "number") {
        mergedDev.workloadPoints = incomingDev.workloadPoints;
      }
      if (typeof incomingDev.velocity === "number") {
        mergedDev.velocity = incomingDev.velocity;
      }
      if (incomingDev.activeTaskId !== undefined) {
        mergedDev.activeTaskId = incomingDev.activeTaskId;
      }
      if (incomingDev.contributions) {
        mergedDev.contributions = { ...originalDev.contributions, ...incomingDev.contributions };
      }

      if (typeof incomingDev.isHead === "boolean" && incomingDev.isHead !== originalDev.isHead) {
        const permission = canSetHeadPrivilege(dbState.developers, currentDevId, originalDev.id, incomingDev.isHead);
        if (!permission.allowed) {
          return res.status(403).json({ error: permission.reason });
        }
      }

      if (isHead && typeof incomingDev.isHead === "boolean") {
        mergedDev.isHead = incomingDev.isHead;
      }

      // SECURITY FIX #1: Hash the new password before storing; only the owner can change their own password
      if (originalDev.id === currentDevId) {
        if (typeof incomingDev.password === "string" && incomingDev.password.trim() !== "") {
          const newPass = incomingDev.password.trim();
          
          // SECURITY FIX: Password Anti-Reuse Policy
          const history = originalDev.passwordHistory || [];
          const isReused = history.some((oldHash: string) => verifyPassword(newPass, oldHash)) || verifyPassword(newPass, originalDev.password);
          
          if (isReused) {
            return res.status(400).json({ error: "Your current password must not match with your last 4 passwords." });
          }

          mergedDev.password = hashPasswordSync(newPass);
          mergedDev.passwordHistory = [originalDev.password, ...history].slice(0, 3);
          mergedDev.passwordChangedAt = new Date();
        } else {
          mergedDev.passwordHistory = originalDev.passwordHistory || [];
        }
      } else {
        mergedDev.password = originalDev.password;
        mergedDev.passwordHistory = originalDev.passwordHistory || [];
      }

      // SECURITY FIX: Retain personalCredentials in state object so StateManager can encrypt them at rest
      mergedDev.personalCredentials = incomingDev.personalCredentials || originalDev.personalCredentials || {};

      updatedDevs.push(mergedDev);
    }

    // Process new developers
    for (const incomingDev of incomingState.developers) {
      const exists = dbState.developers.some((d: any) => d.id === incomingDev.id);
      if (!exists) {
        if (!isHead) {
          return res.status(403).json({ error: "Access Denied: Only a Team Head can register new profiles." });
        }

        const cleanUserId = (incomingDev.userId || incomingDev.name.toLowerCase().replace(/\s+/g, ""))
          .trim().toLowerCase();
        const duplicate = dbState.developers.some((d: any) => d.userId?.toLowerCase() === cleanUserId);

        if (duplicate) {
          return res.status(400).json({ error: `User ID '${cleanUserId}' is already taken.` });
        }

        // Always hash the provided password. If legacy clients omit one, create an unguessable reset-only password.
        const rawPassword = incomingDev.password || crypto.randomBytes(24).toString("base64url");

        updatedDevs.push({
          id: incomingDev.id,
          name: incomingDev.name,
          avatar: incomingDev.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
          email: incomingDev.email || `${cleanUserId}@company.com`,
          role: incomingDev.role,
          skills: incomingDev.skills || [],
          workloadPoints: incomingDev.workloadPoints || 0,
          velocity: incomingDev.velocity || 10,
          isHead: !!incomingDev.isHead,
          userId: cleanUserId,
          password: hashPasswordSync(rawPassword),
          passwordChangedAt: null,
          addedBy: currentDevId,
          personalCredentials: {},
          contributions: incomingDev.contributions || { commits: 0, PRs: 0, reviews: 0 }
        });

        // Add announcement notification
        if (!dbState.settings.notifications) {
          dbState.settings.notifications = [];
        }
        
        const headDev = dbState.developers.find((d: any) => d.id === currentDevId);
        const headName = headDev ? headDev.name : "Team Head";
        
        dbState.settings.notifications.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          message: `${incomingDev.name} joined for ${incomingDev.role} role by ${headName}`,
          createdAt: new Date(),
          readBy: [incomingDev.id, currentDevId]
        });
      }
    }

    dbState.developers = updatedDevs;
    if (!hasAtLeastOneHead(dbState.developers)) {
      return res.status(403).json({ error: "A workspace must always have at least one Team Head." });
    }
  }

  if (incomingState.repositories !== undefined) {
    dbState.repositories = incomingState.repositories;
  }

    await saveState(dbState, workspaceId);

    // SECURITY FIX #5: Return only whitelisted fields
    res.json({ success: true, state: buildSafeState(dbState, currentDevId) });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: getErrorMessage(err, "Failed to save state") });
  }
});

// Reset database state back to default (only Team Head allowed)
router.post("/reset", async (req: any, res: any) => {
  const currentDevId = req.userDevId;
  try {
    const workspaceId = await getWorkspaceIdForDev(currentDevId);
    if (typeof workspaceId !== "string") {
      return res.status(400).json({ error: "Invalid workspace ID format." });
    }
    const dbState = await getState(workspaceId);
    const activeDev = dbState.developers.find((d: any) => d.id === currentDevId);

    if (!activeDev || !activeDev.isHead) {
      return res.status(403).json({ error: "Access Denied: Only a Team Head can reset the enterprise database." });
    }

    // Reset clears project settings but preserves developer accounts
    const resetState = {
      developers: dbState.developers, // Keep existing accounts
      repositories: [],
      settings: { 
        geminiApiKeyHash: "",
        notifications: [],
        recoveryPasscodes: []
      }
    };
    await saveState(resetState, workspaceId);

    // SECURITY FIX #5: Return only whitelisted fields
    res.json({ success: true, state: buildSafeState(resetState, currentDevId) });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: getErrorMessage(err, "Failed to reset state") });
  }
});

export default router;
