import { Router } from "express";
import crypto from "crypto";
import { getState, verifyPassword, hashPasswordSync, saveState } from "../db/stateManager.js";
import { createToken } from "../middlewares/auth.js";
import { Developer } from "../db/models.js";

const router = Router();

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
  const matchedDev = dbState.developers.find(
    (dev: any) => dev.userId?.toLowerCase() === cleanUser
  );

  // Check if they are logging in with a recovery passcode
  let isValidLogin = false;
  
  if (matchedDev) {
    const isPasscode = dbState.settings?.recoveryPasscodes?.find(
      (rp: any) => rp.userId === matchedDev.userId && rp.passcode === password && rp.expiresAt > Date.now()
    );

    if (isPasscode) {
      isValidLogin = true;
      // Invalidate the passcode
      dbState.settings.recoveryPasscodes = dbState.settings.recoveryPasscodes.filter((rp: any) => rp.passcode !== password);
      await saveState(dbState, cleanWorkspace);
    } else if (verifyPassword(password, matchedDev.password)) {
      isValidLogin = true;
    }
  }

  if (!isValidLogin) {
    return res.status(401).json({ error: "Invalid User ID or Password." });
  }

  // Create a secure stateless token
  const token = createToken(
    matchedDev.id,
    rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  );

  // Return user info WITHOUT exposing their password hash
  const sanitizedDev = { ...matchedDev };
  delete sanitizedDev.password;

  res.json({
    success: true,
    token,
    devId: matchedDev.id,
    workspaceId: cleanWorkspace,
    dev: sanitizedDev
  });
});

// Initialize workspace / Register a new workspace
router.post("/register", async (req, res) => {
  const { workspaceId, name, userId, password, email, role } = req.body;

  if (!workspaceId || !name || !userId || !password) {
    return res.status(400).json({ error: "Workspace ID, Name, User ID, and Password are required." });
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
  
  if (!dbState.settings) dbState.settings = {};
  dbState.settings.masterRecoveryKeyHash = masterRecoveryKeyHash;
  await saveState(dbState, cleanWorkspace);

  // Create session token
  const token = createToken(newDev.id);

  const sanitizedDev = { ...newDev };
  delete (sanitizedDev as any).password;

  res.json({
    success: true,
    token,
    devId: newDev.id,
    workspaceId: cleanWorkspace,
    dev: sanitizedDev,
    masterRecoveryKey
  });
});

// Public list of developers (passwords and credentials fully stripped for security, filtered by workspaceId query param)
router.get("/developers", async (req, res) => {
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
    return res.json({ success: true, message: "If the user exists, a passcode has been generated for the Team Head." });
  }

  const passcode = Math.floor(100000 + Math.random() * 900000).toString();
  const newPasscodeEntry = {
    userId: matchedDev.userId,
    passcode,
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
  };

  if (!dbState.settings.recoveryPasscodes) {
    dbState.settings.recoveryPasscodes = [];
  }
  dbState.settings.recoveryPasscodes.push(newPasscodeEntry);
  await saveState(dbState, cleanWorkspace);

  res.json({ success: true, message: "If the user exists, a passcode has been generated for the Team Head." });
});

// Recover Team Head account using Master Recovery Key
router.post("/recover-master", async (req, res) => {
  const { workspaceId, userId, masterRecoveryKey, newPassword } = req.body;
  if (!workspaceId || !userId || !masterRecoveryKey || !newPassword) {
    return res.status(400).json({ error: "All fields are required." });
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

  const newPasswordHash = hashPasswordSync(newPassword);

  // Update in DB
  await Developer.findOneAndUpdate(
    { userId: matchedDev.userId },
    { 
      password: newPasswordHash,
      passwordChangedAt: new Date()
    }
  );

  // Update in state
  matchedDev.password = newPasswordHash;
  matchedDev.passwordChangedAt = new Date().toISOString();
  await saveState(dbState, cleanWorkspace);

  res.json({ success: true, message: "Password updated successfully." });
});

export default router;
