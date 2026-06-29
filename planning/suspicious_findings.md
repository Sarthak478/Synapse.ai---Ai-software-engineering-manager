# Suspicious Findings & Security Risks

During the initial project scan, the following suspicious or potentially insecure patterns were identified:

## 1. Plain Text Passwords — ✅ FIXED
- **Status:** Fixed in `server/db/stateManager.ts`, `server/routes/auth.ts`, `server/routes/state.ts`
- **Fix Applied:**
  - All passwords are now hashed with **bcrypt** (salt rounds = 10) before storage.
  - On startup, `getState()` auto-migrates any plain-text password in `db.json` to a bcrypt hash.
  - Login now uses `bcrypt.compareSync()` for timing-safe comparison.
  - New developer creation and password changes are hashed before writing to disk.

## 2. Hardcoded Credentials / Information Disclosure
- **Location:** `server/routes/auth.ts` line ~22
- **Status:** ⚠️ TESTING PHASE ACCEPTED RISK — Kept as inline code comment reminder.
- **Details:** Login error message hints at demo credentials (`alice` / `password123`).
- **Action Required Before Production:** Remove the hint from the error message and implement a proper onboarding flow for new developers.

## 3. Client-Side API Key Header Trust — ✅ FIXED
- **Status:** Fixed in `server/routes/gemini.ts`
- **Fix Applied:**
  - A `isValidGeminiKeyFormat()` validator rejects any `x-gemini-api-key` header that doesn't start with `AIza` or is shorter than 35 characters.
  - Malformed/invalid keys are silently discarded; the server falls back to the `.env` key only.
  - On the **client side**, all 5 AI feature components now gate their triggers behind `state.settings.hasGeminiApiKey`. If no key is configured, a **popup modal** (`ApiKeyRequiredModal.tsx`) appears prompting the user to go to Settings.

## 4. Hardcoded Mock Responses
- **Location:** `server/routes/gemini.ts` — all 4 endpoints
- **Status:** ⚠️ TESTING PHASE ACCEPTED RISK — Kept as inline `⚠️ TESTING PHASE REMINDER` code comments.
- **Details:** When the Gemini API key is missing, all endpoints return hardcoded simulation data. Clients now see the API key modal before hitting these endpoints, so mock data is no longer silently used without user awareness.
- **Action Required Before Production:** Remove all `isMock` branches and mock return blocks from `gemini.ts`. Make a configured `GEMINI_API_KEY` mandatory in `.env`.

## 5. Potential API Key Leakage in State Sync — ✅ FIXED
- **Status:** Fixed in `server/routes/state.ts` and `server/db/stateManager.ts`
- **Fix Applied:**
  - **Client responses:** `buildSafeDevRecord()` function uses an explicit `CLIENT_SAFE_DEV_FIELDS` allowlist. No field outside this list can be sent to clients, regardless of what gets added to developer objects in the future.
  - **Disk writes:** `sanitizeDevForDisk()` in `stateManager.ts` uses a matching `DEV_DISK_FIELDS` allowlist. `personalCredentials` is always forced to `{}` before writing.
  - The old pattern of "spread all fields then delete a few" has been fully replaced.
