import test from "node:test";
import assert from "node:assert/strict";
import { buildSettingsSavePayload } from "../../client/src/geminiSettings.ts";
import { encryptKey } from "../db/stateManager.ts";
import { hasStoredGeminiApiKey, repairGeminiKeySettings } from "./geminiKeyState.ts";

test("buildSettingsSavePayload does not clear the Gemini key on unrelated saves", () => {
  const payload = buildSettingsSavePayload({
    hasGeminiApiKey: true,
    notifications: [{ id: "n1" }],
    recoveryPasscodes: []
  });

  assert.deepEqual(payload, {
    notifications: [{ id: "n1" }],
    recoveryPasscodes: []
  });
  assert.equal("geminiApiKeyHash" in payload, false);
  assert.equal("geminiApiKeyEncrypted" in payload, false);
});

test("repairGeminiKeySettings rebuilds key presence from the encrypted workspace secret", () => {
  const encrypted = encryptKey("AIza123456789012345678901234567890123");
  const repaired = repairGeminiKeySettings({
    geminiApiKeyHash: "",
    geminiApiKeyEncrypted: encrypted
  });

  assert.equal(hasStoredGeminiApiKey(repaired), true);
  assert.match(repaired.geminiApiKeyHash, /^[a-f0-9]{64}$/);
});
