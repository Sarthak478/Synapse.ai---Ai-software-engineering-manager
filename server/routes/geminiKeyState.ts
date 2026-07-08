import crypto from "crypto";
import { decryptKey } from "../db/stateManager.js";

export function hashGeminiApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
}

export function hasStoredGeminiApiKey(settings: any): boolean {
  const hash = (settings?.geminiApiKeyHash || "").trim();
  const encrypted = (settings?.geminiApiKeyEncrypted || "").trim();
  return !!(hash || encrypted);
}

export function repairGeminiKeySettings(settings: any) {
  const normalized = {
    ...(settings || {}),
    geminiApiKeyHash: (settings?.geminiApiKeyHash || "").trim(),
    geminiApiKeyEncrypted: (settings?.geminiApiKeyEncrypted || "").trim()
  };

  if (normalized.geminiApiKeyHash || !normalized.geminiApiKeyEncrypted) {
    return normalized;
  }

  const decryptedKey = decryptKey(normalized.geminiApiKeyEncrypted);
  if (!decryptedKey) {
    return normalized;
  }

  return {
    ...normalized,
    geminiApiKeyHash: hashGeminiApiKey(decryptedKey)
  };
}
