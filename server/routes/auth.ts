import { Router } from "express";
import { getState, verifyPassword, hashPasswordSync, saveState } from "../db/stateManager.js";
import { createToken } from "../middlewares/auth.js";
import { Developer } from "../db/models.js";

const router = Router();

// Login and obtain a secure session token
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const dbState = await getState();
  const cleanUser = username.trim().toLowerCase();
  const matchedDev = dbState.developers.find(
    (dev: any) => dev.userId?.toLowerCase() === cleanUser
  );

  // SECURITY FIX #1: Compare with bcrypt instead of plain-text equality
  if (!matchedDev || !verifyPassword(password, matchedDev.password)) {
    return res.status(401).json({ error: "Invalid User ID or Password." });
  }

  // Create a secure stateless token
  const token = createToken(matchedDev.id);

  // Return user info WITHOUT exposing their password hash
  const sanitizedDev = { ...matchedDev };
  delete sanitizedDev.password;

  res.json({
    success: true,
    token,
    devId: matchedDev.id,
    dev: sanitizedDev
  });
});

// First-time Team Head registration — only available when NO developers exist
router.post("/register", async (req, res) => {
  const { name, userId, password, email, role } = req.body;

  if (!name || !userId || !password) {
    return res.status(400).json({ error: "Name, User ID, and Password are required." });
  }

  // Remove restriction so anyone can register
  const dbState = await getState();

  const cleanUserId = userId.trim().toLowerCase().replace(/\s+/g, "");
  const hashedPassword = hashPasswordSync(password);

  const newDev = {
    id: `dev-${Date.now()}`,
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
    personalCredentials: {},
    contributions: { commits: 0, PRs: 0, reviews: 0 }
  };

  // Save to database
  await Developer.create(newDev);

  // Create session token
  const token = createToken(newDev.id);

  const sanitizedDev = { ...newDev };
  delete (sanitizedDev as any).password;

  res.json({
    success: true,
    token,
    devId: newDev.id,
    dev: sanitizedDev
  });
});

// Public list of developers (passwords and credentials fully stripped for security)
router.get("/developers", async (req, res) => {
  const dbState = await getState();
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

export default router;
