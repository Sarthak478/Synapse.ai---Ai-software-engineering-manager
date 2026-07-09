import test from "node:test";
import assert from "node:assert/strict";
import { resolveEncryptionSecret } from "./stateManager.ts";

test("resolveEncryptionSecret requires a strong explicit secret in production", () => {
  assert.throws(
    () => resolveEncryptionSecret({ NODE_ENV: "production", JWT_SECRET: "short" }),
    /DATA_ENCRYPTION_SECRET or JWT_SECRET/
  );

  assert.equal(
    resolveEncryptionSecret({
      NODE_ENV: "production",
      DATA_ENCRYPTION_SECRET: "12345678901234567890123456789012"
    }),
    "12345678901234567890123456789012"
  );
});
