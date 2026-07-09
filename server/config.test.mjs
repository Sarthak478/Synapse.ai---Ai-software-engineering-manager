import test from "node:test";
import assert from "node:assert/strict";
import { buildCorsOptions, parsePort } from "./config.ts";

test("parsePort rejects invalid production port values", () => {
  assert.throws(() => parsePort("70000", 3001), /Invalid PORT/);
  assert.equal(parsePort("8080", 3001), 8080);
});

test("buildCorsOptions requires an allowlist in production", () => {
  assert.throws(
    () => buildCorsOptions({ NODE_ENV: "production" }),
    /APP_URL or CORS_ORIGINS/
  );
});

test("buildCorsOptions only allows configured production origins", async () => {
  const corsOptions = buildCorsOptions({
    NODE_ENV: "production",
    CORS_ORIGINS: "https://app.example.com,https://admin.example.com"
  });

  const checkOrigin = (origin) =>
    new Promise((resolve, reject) => {
      corsOptions.origin(origin, (error, allowed) => {
        if (error) reject(error);
        else resolve(allowed);
      });
    });

  assert.equal(await checkOrigin("https://app.example.com"), true);
  assert.equal(await checkOrigin("https://evil.example.com"), false);
});
