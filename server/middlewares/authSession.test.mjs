import test from "node:test";
import assert from "node:assert/strict";
import { createToken, verifyToken } from "./auth.ts";

test("tokens created by the auth middleware verify successfully", () => {
  const token = createToken("dev-123");
  assert.equal(verifyToken(token), "dev-123");
});

test("custom token durations are encoded into the token expiry", () => {
  const now = Date.now();
  const token = createToken("dev-123", 7 * 24 * 60 * 60 * 1000);
  const [, expiresAtStr] = token.split(":");
  const expiresAt = Number(expiresAtStr);

  assert.ok(expiresAt > now + 6 * 24 * 60 * 60 * 1000);
});
