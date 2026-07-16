import type { CorsOptions } from "cors";

function parseAllowedOrigins(env: NodeJS.ProcessEnv): string[] {
  return [
    ...(env.CORS_ORIGINS || "").split(","),
    env.APP_URL || ""
  ]
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function parsePort(rawPort: string | undefined, fallback: number): number {
  if (!rawPort) return fallback;
  const parsed = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }
  return parsed;
}

export function buildCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  const allowedOrigins = parseAllowedOrigins(env);
  const isProduction = env.NODE_ENV === "production";

  if (isProduction && allowedOrigins.length === 0) {
    throw new Error("APP_URL or CORS_ORIGINS must be configured in production.");
  }

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (!isProduction && allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.includes(origin));
    },
    credentials: true
  };
}
