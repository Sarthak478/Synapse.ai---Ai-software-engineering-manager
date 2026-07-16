import crypto from "crypto";

const DEFAULT_SESSION_MS = 24 * 60 * 60 * 1000;

export function resolveJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  if (env.JWT_SECRET && env.JWT_SECRET.length >= 32) {
    return env.JWT_SECRET;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set to at least 32 characters in production.");
  }

  return crypto
    .createHash("sha256")
    .update(String(env.MONGODB_URI || "synapse-dev-session-secret"))
    .digest("hex");
}

const JWT_SECRET = resolveJwtSecret();

function signaturesMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

/**
 * Create a secure stateless JWT token containing developer ID, session version, and expiry
 */
export function createToken(devId: string, sessionVersion: number = 1, expiresInMs: number = DEFAULT_SESSION_MS): string {
  const expiresAt = Date.now() + expiresInMs;
  const payload = `${devId}:${sessionVersion}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export function verifyTokenWithSecret(token: string, secret: string): { devId: string, sessionVersion: number } | null {
  if (!token) return null;
  try {
    const parts = token.split(":");
    // Legacy tokens had 3 parts, new tokens have 4 parts (devId, sessionVersion, expiresAt, signature)
    if (parts.length === 3) {
      const [devId, expiresAtStr, signature] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);
      if (isNaN(expiresAt) || Date.now() > expiresAt) return null;
      const expectedSignature = crypto.createHmac("sha256", secret).update(`${devId}:${expiresAt}`).digest("hex");
      if (!signaturesMatch(signature, expectedSignature)) return null;
      return { devId, sessionVersion: 1 };
    } else if (parts.length === 4) {
      const [devId, sessionVersionStr, expiresAtStr, signature] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);
      const sessionVersion = parseInt(sessionVersionStr, 10);
      if (isNaN(expiresAt) || Date.now() > expiresAt || isNaN(sessionVersion)) return null;
      const expectedSignature = crypto.createHmac("sha256", secret).update(`${devId}:${sessionVersion}:${expiresAt}`).digest("hex");
      if (!signaturesMatch(signature, expectedSignature)) return null;
      return { devId, sessionVersion };
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Verify session token cryptographically and return the matching payload
 */
export function verifyToken(token: string): { devId: string, sessionVersion: number } | null {
  return verifyTokenWithSecret(token, JWT_SECRET);
}

/**
 * Parse the synapse_session cookie from raw headers.
 * This avoids adding a cookie-parser dependency.
 */
function parseCookieToken(req: any): string | null {
  const cookieHeader = req.headers["cookie"];
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)synapse_session=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

import { Developer } from "../db/models.js";

/**
 * Express middleware to authenticate requests.
 * Priority: HttpOnly cookie → Authorization Bearer header.
 */
export const authenticateToken = async (req: any, res: any, next: any) => {
  // 1. Try HttpOnly cookie first (secure, not accessible to JS)
  let token = parseCookieToken(req);

  // 2. Fall back to Authorization header (for API clients / backward compat)
  if (!token) {
    const authHeader = req.headers["authorization"];
    token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
  }

  if (!token) {
    return res.status(401).json({ error: "Access Denied: No authentication token provided." });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: "Access Denied: Session expired or invalid token." });
  }

  // SECURITY FIX #12: Token Revocation Check
  try {
    const dev = await Developer.findOne({ id: payload.devId }).lean();
    if (!dev) {
      return res.status(403).json({ error: "Access Denied: User no longer exists." });
    }
    if (dev.sessionVersion && dev.sessionVersion > payload.sessionVersion) {
      return res.status(403).json({ error: "Access Denied: Session revoked. Please log in again." });
    }
  } catch (e) {
    return res.status(500).json({ error: "Authentication service error." });
  }

  req.userDevId = payload.devId;
  next();
};
