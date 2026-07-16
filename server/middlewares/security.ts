import { Request, Response, NextFunction } from "express";

/**
 * Recursively sanitize inputs to prevent JSON injection, path traversal, null bytes, and script blocks
 */
export function sanitizeInput(val: any): any {
  if (typeof val === "string") {
    // Escape script tags and trim whitespace
    let cleaned = val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    // Remove null bytes and path traversal vectors
    cleaned = cleaned.replace(/\0/g, "").replace(/\.\.+\//g, "");
    return cleaned;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeInput);
  }
  if (val !== null && typeof val === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(val)) {
      // Prevent prototype pollution
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      sanitized[key] = sanitizeInput(val[key]);
    }
    return sanitized;
  }
  return val;
}

/**
 * Sets security headers and filters input body/queries
 */
export function securityMiddleware(req: any, res: any, next: any) {
  // --- Strip server fingerprinting headers ---
  res.removeHeader("X-Powered-By");
  res.removeHeader("Server");

  // --- Core Security Headers ---
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

  // --- Content Security Policy (all environments) ---
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://images.unsplash.com https://api.dicebear.com",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

  // --- Production-only transport security ---
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  next();
}

export function createRateLimiter(options: { windowMs: number; maxRequests: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function rateLimit(req: any, res: any, next: any) {
    const now = Date.now();
    const key = req.ip || req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (current.count >= options.maxRequests) {
      res.status(429).json({ error: "Too many requests. Please wait and try again." });
      return;
    }

    current.count += 1;
    next();
  };
}

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30
});

export const aiRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20
});

/**
 * Global application error boundary
 */
export function errorBoundary(err: any, req: any, res: any, next: any) {
  console.error("Unhandled Internal Server Error:", err);
  res.status(err.status || 500).json({
    error: "A secure server error occurred. Please contact your enterprise administrator."
  });
}

/**
 * SECURITY FIX #7: Hide internal error details in production
 */
export function getErrorMessage(err: any, fallback: string): string {
  if (process.env.NODE_ENV === "production") {
    return fallback;
  }
  return err.message ? `${fallback}: ${err.message}` : fallback;
}

/**
 * SECURITY FIX #10: Strict CSRF protection validating Origin and Referer headers
 * against allowed origins for all state-mutating requests.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Safe methods don't need CSRF protection
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // If no Origin or Referer is provided, reject the request (browser always sends them for cross-origin POST)
  if (!origin && !referer) {
    console.warn(`[CSRF] Blocked request with missing Origin and Referer headers from IP: ${req.ip}`);
    return res.status(403).json({ error: "CSRF verification failed: Missing origin headers." });
  }

  // Validate against configured APP_URL or localhost in development
  const allowedUrl = process.env.APP_URL || "http://localhost:3000";
  const sourceUrl = origin || referer || "";

  if (!sourceUrl.startsWith(allowedUrl) && process.env.NODE_ENV === "production") {
    console.warn(`[CSRF] Blocked request from unauthorized origin: ${sourceUrl}`);
    return res.status(403).json({ error: "CSRF verification failed: Invalid origin." });
  }

  next();
}

