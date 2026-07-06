import { Router } from "express";
import { getState, saveState, defaultState, hashPasswordSync, encryptKey } from "../db/stateManager.js";
import { Developer } from "../db/models.js";

const router = Router();

// SECURITY FIX #5: Explicit allowlist of developer fields that may be sent to clients
const CLIENT_SAFE_DEV_FIELDS = [
  "id", "workspaceId", "name", "avatar", "email", "role", "skills",
  "workloadPoints", "velocity", "activeTaskId", "isHead",
  "userId", "contributions", "addedBy", "passwordChangedAt"
] as const;

async function getWorkspaceIdForDev(devId: string): Promise<string> {
  const dev = await Developer.findOne({ id: devId }).lean();
  if (!dev) throw new Error("Developer not found");
  return dev.workspaceId;
}

function buildSafeDevRecord(d: any): any {
  const safe: any = {};
  for (const key of CLIENT_SAFE_DEV_FIELDS) {
    if (key in d) safe[key] = d[key];
  }
  return safe;
}

function buildSafeState(dbState: any) {
  const sanitized: any = { ...dbState };
  sanitized.developers = dbState.developers.map(buildSafeDevRecord);
  sanitized.settings = {
    hasGeminiApiKey: !!dbState.settings?.geminiApiKeyHash,
    notifications: dbState.settings?.notifications || [],
    recoveryPasscodes: dbState.settings?.recoveryPasscodes || []
  };
  return sanitized;
}

// Obtain complete applet database state (requires token, strips passwords and all sensitive fields via whitelist)
router.get("/", async (req: any, res: any) => {
  try {
    const workspaceId = await getWorkspaceIdForDev(req.userDevId);
    const dbState = await getState(workspaceId);
    res.json(buildSafeState(dbState));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
    const dbState = await getState(workspaceId);

  // 0. Update settings (only Head can configure Gemini Key)
  if (incomingState.settings) {
    const isHead = dbState.developers.find((d: any) => d.id === currentDevId)?.isHead === true;
    if (incomingState.settings.geminiApiKeyHash !== undefined) {
      // Only enforce Team Head restriction if the value is actually being changed
      const existingHash = dbState.settings.geminiApiKeyHash || "";
      const incomingHash = (incomingState.settings.geminiApiKeyHash || "").trim();
      if (incomingHash !== existingHash) {
        if (!isHead) {
          return res.status(403).json({ error: "Access Denied: Only a Project Head can configure the team's Gemini API Key." });
        }
        dbState.settings.geminiApiKeyHash = incomingHash;
        // Store the raw key server-side so the Gemini route can use it directly
        // The client sends it once during save, then forgets it
        if (incomingState.settings.geminiApiKeyEncrypted !== undefined) {
          dbState.settings.geminiApiKeyEncrypted = encryptKey(incomingState.settings.geminiApiKeyEncrypted.trim());
        }
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

      if (isHead && typeof incomingDev.isHead === "boolean") {
        mergedDev.isHead = incomingDev.isHead;
      }

      // SECURITY FIX #1: Hash the new password before storing; only the owner can change their own password
      if (originalDev.id === currentDevId) {
        if (typeof incomingDev.password === "string" && incomingDev.password.trim() !== "") {
          mergedDev.password = hashPasswordSync(incomingDev.password.trim());
          mergedDev.passwordChangedAt = new Date();
        }
      } else {
        mergedDev.password = originalDev.password;
      }

      // personalCredentials are held strictly client-side
      mergedDev.personalCredentials = {};

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

        // SECURITY FIX #1: Always hash the default password before storing new developers
        const rawPassword = incomingDev.password || "changeme";

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
          readBy: [incomingDev.id]
        });
      }
    }

    dbState.developers = updatedDevs;
  }

    await saveState(dbState, workspaceId);

    // SECURITY FIX #5: Return only whitelisted fields
    res.json({ success: true, state: buildSafeState(dbState) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset database state back to default (only Team Head allowed)
router.post("/reset", async (req: any, res: any) => {
  const currentDevId = req.userDevId;
  try {
    const workspaceId = await getWorkspaceIdForDev(currentDevId);
    const dbState = await getState(workspaceId);
    const activeDev = dbState.developers.find((d: any) => d.id === currentDevId);

    if (!activeDev || !activeDev.isHead) {
      return res.status(403).json({ error: "Access Denied: Only a Team Head can reset the enterprise database." });
    }

    // Reset clears project settings but preserves developer accounts
    const resetState = {
      developers: dbState.developers, // Keep existing accounts
      settings: { 
        geminiApiKeyHash: "",
        notifications: [],
        recoveryPasscodes: []
      }
    };
    await saveState(resetState, workspaceId);

    // SECURITY FIX #5: Return only whitelisted fields
    res.json({ success: true, state: buildSafeState(resetState) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
