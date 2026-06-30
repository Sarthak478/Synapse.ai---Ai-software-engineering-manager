import { Router } from "express";
import { getState, verifyPassword } from "../db/stateManager.js";
import { createToken } from "../middlewares/auth.js";

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
    // ⚠️ TESTING PHASE REMINDER: Error message below hints at demo credentials.
    // Remove this hint before production deployment.
    return res.status(401).json({ error: "Invalid User ID or Password. Try 'alice' and 'password123' to test." });
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
