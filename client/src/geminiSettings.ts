export const MASKED_GEMINI_KEY = "configured (masked for security)";

export function buildSettingsSavePayload(settings: any, rawGeminiKeyToSend?: string) {
  const payload: any = {
    notifications: settings?.notifications || [],
    recoveryPasscodes: settings?.recoveryPasscodes || []
  };

  // Only include Gemini key fields when the user explicitly changed the key.
  if (rawGeminiKeyToSend !== undefined) {
    payload.geminiApiKeyHash = settings?.geminiApiKeyHash || "";
    payload.geminiApiKeyEncrypted = rawGeminiKeyToSend;
  }

  return payload;
}
