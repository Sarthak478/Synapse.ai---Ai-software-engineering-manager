import test from "node:test";
import assert from "node:assert/strict";
import { createToken, resolveJwtSecret, verifyTokenWithSecret } from "./auth.ts";

test("resolveJwtSecret refuses fallback secrets in production", () => {
  assert.throws(
    () => resolveJwtSecret({ NODE_ENV: "production" }),
    /JWT_SECRET/
  );
});

test("verifyTokenWithSecret rejects tampered signatures", () => {
  const token = createToken("dev-secure", 60_000);
  const tampered = token.replace(/.$/, token.endsWith("0") ? "1" : "0");

  assert.equal(verifyTokenWithSecret(tampered, resolveJwtSecret()), null);
});
