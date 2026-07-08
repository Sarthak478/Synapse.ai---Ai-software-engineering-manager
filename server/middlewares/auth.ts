import crypto from "crypto";

const DEFAULT_SESSION_MS = 24 * 60 * 60 * 1000;
const STABLE_FALLBACK_SECRET = crypto
  .createHash("sha256")
  .update(String(process.env.MONGODB_URI || "synapse-dev-session-secret"))
  .digest("hex");

// Use a persistent JWT secret, or a deterministic development fallback so refreshes survive server restarts.
const JWT_SECRET = process.env.JWT_SECRET || STABLE_FALLBACK_SECRET;

/**
 * Create a secure stateless JWT token containing developer ID and expiry timestamp
 */
export function createToken(devId: string, expiresInMs: number = DEFAULT_SESSION_MS): string {
  const expiresAt = Date.now() + expiresInMs;
  const payload = `${devId}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

/**
 * Verify session token cryptographically and return the matching developer ID
 */
export function verifyToken(token: string): string | null {
  if (!token) return null;
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return null;
    const [devId, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;

    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${devId}:${expiresAt}`).digest("hex");
    if (signature !== expectedSignature) return null;

    return devId;
  } catch (e) {
    return null;
  }
}

/**
 * Express middleware to authenticate Bearer headers and set req.userDevId
 */
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Access Denied: No authentication token provided." });
  }

  const devId = verifyToken(token);
  if (!devId) {
    return res.status(403).json({ error: "Access Denied: Session expired or invalid token." });
  }

  req.userDevId = devId;
  next();
};
