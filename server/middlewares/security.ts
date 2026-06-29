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
  // Set production security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  next();
}

/**
 * Global application error boundary
 */
export function errorBoundary(err: any, req: any, res: any, next: any) {
  console.error("Unhandled Internal Server Error:", err);
  res.status(err.status || 500).json({
    error: "A secure server error occurred. Please contact your enterprise administrator."
  });
}
