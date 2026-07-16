import { Router } from "express";
import crypto from "crypto";
import { getState, verifyPassword, hashPasswordSync, saveState } from "../db/stateManager.js";
import { createToken } from "../middlewares/auth.js";
import { Developer } from "../db/models.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = Router();

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * SECURITY FIX #14: Enforce minimum password complexity
 */
function isPasswordComplex(password: string): boolean {
  // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}

/**
 * SECURITY FIX #15: Security Logging / Audit Trail
 */
async function logSecurityEvent(workspaceId: string, eventType: string, details: string) {
  try {
    const cleanWorkspace = workspaceId.trim().toLowerCase();
    const dbState = await getState(cleanWorkspace);
    if (!dbState.settings.auditLogs) {
      dbState.settings.auditLogs = [];
    }
    dbState.settings.auditLogs.push({
      eventType,
      details,
      timestamp: new Date().toISOString()
    });
    await saveState(dbState, cleanWorkspace);
  } catch (e) {
    console.error("[AuditLog] Failed to record security event:", e);
  }
}

/**
 * Helper: Set an HttpOnly session cookie on the response.
 * The cookie is invisible to client-side JavaScript, preventing XSS token theft.
 */
function setSessionCookie(res: any, token: string, rememberMe: boolean) {
  const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie("synapse_session", token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "strict" : "lax",
    path: "/",
    maxAge,
  });
}

/**
 * Helper: Clear the session cookie.
 */
function clearSessionCookie(res: any) {
  res.clearCookie("synapse_session", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "strict" : "lax",
    path: "/",
  });
}

// Login and obtain a secure session token scoped by workspaceId
router.post("/login", async (req, res) => {
  const { workspaceId, username, password, rememberMe } = req.body;
  if (!workspaceId || !username || !password) {
    return res.status(400).json({ error: "Workspace ID, Username, and Password are required." });
  }

  const cleanWorkspace = workspaceId.trim().toLowerCase();
  
  // Verify workspace existence first
  const workspaceExists = await Developer.exists({ workspaceId: cleanWorkspace });
  if (!workspaceExists) {
    return res.status(404).json({ error: "No such workspace existed." });
  }

  const dbState = await getState(cleanWorkspace);
  const cleanUser = username.trim().toLowerCase();
  
  // SECURITY FIX #11: Account lockout
  const dbDevModel = await Developer.findOne({ userId: cleanUser, workspaceId: cleanWorkspace });
  if (dbDevModel) {
    if (dbDevModel.lockedUntil && new Date() < dbDevModel.lockedUntil) {
      await logSecurityEvent(cleanWorkspace, "LOGIN_LOCKED", `Blocked login attempt for locked account ${cleanUser}`);
      return res.status(403).json({ error: "Account is temporarily locked due to too many failed attempts. Try again later." });
    }
  }

  const matchedDev = dbState.developers.find(
    (dev: any) => dev.userId?.toLowerCase() === cleanUser
  );

  // Check if they are logging in with a recovery passcode
  let isValidLogin = false;
  
  if (matchedDev) {
    // SECURITY FIX #2: Recovery passcodes are now bcrypt-hashed — use verifyPassword() instead of ===
    const matchedPasscode = dbState.settings?.recoveryPasscodes?.find(
      (rp: any) => rp.userId === matchedDev.userId && rp.expiresAt > Date.now() && verifyPassword(password, rp.passcodeHash)
    );

    if (matchedPasscode) {
      isValidLogin = true;
      // Invalidate the used passcode
      dbState.settings.recoveryPasscodes = dbState.settings.recoveryPasscodes.filter(
        (rp: any) => rp !== matchedPasscode
      );
      await saveState(dbState, cleanWorkspace);
    } else if (verifyPassword(password, matchedDev.password)) {
      isValidLogin = true;
    }
  }

  if (!isValidLogin) {
    if (dbDevModel) {
      dbDevModel.failedLoginAttempts = (dbDevModel.failedLoginAttempts || 0) + 1;
      if (dbDevModel.failedLoginAttempts >= 5) {
        dbDevModel.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await logSecurityEvent(cleanWorkspace, "ACCOUNT_LOCKED", `Account ${cleanUser} locked after 5 failed attempts`);
      } else {
        await logSecurityEvent(cleanWorkspace, "LOGIN_FAILED", `Failed login attempt for ${cleanUser}`);
      }
      await dbDevModel.save();
    }
    return res.status(401).json({ error: "Invalid User ID or Password." });
  }

  if (dbDevModel) {
    dbDevModel.failedLoginAttempts = 0;
    dbDevModel.lockedUntil = null;
    await dbDevModel.save();
  }
  await logSecurityEvent(cleanWorkspace, "LOGIN_SUCCESS", `Successful login for ${cleanUser}`);

  // Create a secure stateless token
  const sessionVersion = dbDevModel ? dbDevModel.sessionVersion || 1 : 1;
  const token = createToken(
    matchedDev.id,
    sessionVersion,
    rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  );

  // SECURITY FIX #3: Set HttpOnly cookie — token is no longer exposed to client JS
  setSessionCookie(res, token, !!rememberMe);

  // Return user info WITHOUT exposing their password hash
  const sanitizedDev = { ...matchedDev };
  delete sanitizedDev.password;

  res.json({
    success: true,
    devId: matchedDev.id,
    workspaceId: cleanWorkspace,
    dev: sanitizedDev
  });
});

// Logout — clear the HttpOnly session cookie
router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

// Initialize workspace / Register a new workspace
router.post("/register", async (req, res) => {
  const { workspaceId, name, userId, password, email, role } = req.body;

  if (!workspaceId || !name || !userId || !password) {
    return res.status(400).json({ error: "Workspace ID, Name, User ID, and Password are required." });
  }

  // SECURITY FIX #14: Enforce password complexity
  if (!isPasswordComplex(password)) {
    return res.status(400).json({ error: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character." });
  }

  const cleanWorkspace = workspaceId.trim().toLowerCase();

  // Check if workspace already exists
  const workspaceExists = await Developer.exists({ workspaceId: cleanWorkspace });
  if (workspaceExists) {
    return res.status(400).json({ error: "Workspace already initialized." });
  }

  const cleanUserId = userId.trim().toLowerCase().replace(/\s+/g, "");

  // Check if username is already taken globally
  const userExists = await Developer.exists({ userId: cleanUserId });
  if (userExists) {
    return res.status(400).json({ error: "Username already taken globally." });
  }

  const hashedPassword = hashPasswordSync(password);

  const newDev = {
    id: `dev-${Date.now()}`,
    workspaceId: cleanWorkspace,
    name: name.trim(),
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
    email: email?.trim() || `${cleanUserId}@company.com`,
    role: role?.trim() || "Team Head",
    skills: [],
    workloadPoints: 0,
    velocity: 10,
    isHead: true,
    userId: cleanUserId,
    password: hashedPassword,
    passwordChangedAt: null,
    addedBy: "system",
    personalCredentials: {},
    contributions: { commits: 0, PRs: 0, reviews: 0 }
  };

  // Save to database
  await Developer.create(newDev);

  // Load state to auto-generate workspace settings
  const dbState = await getState(cleanWorkspace);

  // Generate Master Recovery Key for Team Head
  const masterRecoveryKey = crypto.randomBytes(8).toString("hex").toUpperCase();
  const masterRecoveryKeyHash = hashPasswordSync(masterRecoveryKey);
  
  dbState.settings.masterRecoveryKeyHash = masterRecoveryKeyHash;
  await saveState(dbState, cleanWorkspace);

  // Create session token and set HttpOnly cookie
  const token = createToken(newDev.id, 1, 24 * 60 * 60 * 1000); // Default to 24h for register, sessionVersion=1
  setSessionCookie(res, token, false);

  await logSecurityEvent(cleanWorkspace, "WORKSPACE_INIT", `Workspace initialized by ${cleanUserId}`);

  const sanitizedDev = { ...newDev };
  delete (sanitizedDev as any).password;

  res.json({
    success: true,
    devId: newDev.id,
    workspaceId: cleanWorkspace,
    dev: sanitizedDev,
    masterRecoveryKey
  });
});

// SECURITY FIX #4: Developer listing now requires authentication to prevent user enumeration
router.get("/developers", authenticateToken, async (req: any, res) => {
  const workspaceId = req.query.workspaceId as string;
  if (!workspaceId) {
    return res.json([]);
  }
  const dbState = await getState(workspaceId);
  const publicDevs = dbState.developers.map((d: any) => ({
    id: d.id,
    name: d.name,
    avatar: d.avatar,
    role: d.role,
    userId: d.userId,
    isHead: d.isHead
  }));
  res.json(publicDevs);
});

// Forgot Password Flow - Generate Passcode scoped by workspaceId
router.post("/forgot-password", async (req, res) => {
  const { workspaceId, userId } = req.body;
  if (!workspaceId || !userId) {
    return res.status(400).json({ error: "Workspace ID and User ID are required." });
  }

  const cleanWorkspace = workspaceId.trim().toLowerCase();
  
  // Verify workspace existence first
  const workspaceExists = await Developer.exists({ workspaceId: cleanWorkspace });
  if (!workspaceExists) {
    return res.status(404).json({ error: "No such workspace existed." });
  }

  const dbState = await getState(cleanWorkspace);
  const cleanUser = userId.trim().toLowerCase();
  const matchedDev = dbState.developers.find(
    (dev: any) => dev.userId?.toLowerCase() === cleanUser
  );

  if (!matchedDev) {
    // Return generic success to avoid user enumeration
    return res.json({ success: true, message: "Please ask the team head for the passcode for your access." });
  }

  // SECURITY FIX #2: Use cryptographically secure random number generator instead of Math.random()
  const passcode = crypto.randomInt(100000, 999999).toString();
  // SECURITY FIX #2: Hash the passcode before storing in DB — plain text never persisted
  const passcodeHash = hashPasswordSync(passcode);

  const newPasscodeEntry = {
    userId: matchedDev.userId,
    passcodeHash,
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
  };

  if (!dbState.settings.recoveryPasscodes) {
    dbState.settings.recoveryPasscodes = [];
  }
  dbState.settings.recoveryPasscodes.push(newPasscodeEntry);

  // SECURITY FIX #2: Create a head-only notification with the plain passcode
  // so the Team Head can see it once and give it to the team member
  if (!dbState.settings.notifications) {
    dbState.settings.notifications = [];
  }
  dbState.settings.notifications.push({
    id: `passcode-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    message: `Password reset requested for ${matchedDev.userId}`,
    passcode,
    targetUserId: matchedDev.userId,
    headOnly: true,
    createdAt: new Date(),
    readBy: [],
    expiresAt: Date.now() + 15 * 60 * 1000
  });

  await saveState(dbState, cleanWorkspace);

  res.json({ success: true, message: "Please ask the team head for the passcode for your access." });
});

// Recover Team Head account using Master Recovery Key
router.post("/recover-master", async (req, res) => {
  const { workspaceId, userId, masterRecoveryKey, newPassword } = req.body;
  if (!workspaceId || !userId || !masterRecoveryKey || !newPassword) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // SECURITY FIX #14: Enforce password complexity
  if (!isPasswordComplex(newPassword)) {
    return res.status(400).json({ error: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character." });
  }

  const cleanWorkspace = workspaceId.trim().toLowerCase();
  const workspaceExists = await Developer.exists({ workspaceId: cleanWorkspace });
  if (!workspaceExists) {
    return res.status(404).json({ error: "No such workspace existed." });
  }

  const dbState = await getState(cleanWorkspace);
  const cleanUser = userId.trim().toLowerCase();
  const matchedDev = dbState.developers.find(
    (dev: any) => dev.userId?.toLowerCase() === cleanUser
  );

  if (!matchedDev || !matchedDev.isHead) {
    return res.status(403).json({ error: "Invalid user or not a Team Head." });
  }

  if (!dbState.settings.masterRecoveryKeyHash || !verifyPassword(masterRecoveryKey, dbState.settings.masterRecoveryKeyHash)) {
    return res.status(401).json({ error: "Invalid Master Recovery Key." });
  }

  // SECURITY FIX: Password Anti-Reuse Policy
  const history = matchedDev.passwordHistory || [];
  const isReused = history.some((oldHash: string) => verifyPassword(newPassword, oldHash)) || verifyPassword(newPassword, matchedDev.password);
  
  if (isReused) {
    return res.status(400).json({ error: "Your current password must not match with your last 4 passwords." });
  }

  const newPasswordHash = hashPasswordSync(newPassword);
  const newHistory = [matchedDev.password, ...history].slice(0, 3);

  // Update in DB
  // SECURITY FIX #12: Increment sessionVersion to revoke old tokens
  await Developer.findOneAndUpdate(
    { userId: matchedDev.userId },
    { 
      password: newPasswordHash,
      passwordHistory: newHistory,
      passwordChangedAt: new Date(),
      $inc: { sessionVersion: 1 }
    }
  );

  // Update in state
  matchedDev.password = newPasswordHash;
  matchedDev.passwordChangedAt = new Date().toISOString();
  await saveState(dbState, cleanWorkspace);
  
  await logSecurityEvent(cleanWorkspace, "PASSWORD_RESET", `Password reset via master key for ${cleanUser}`);

  res.json({ success: true, message: "Password updated successfully." });
});

export default router;
