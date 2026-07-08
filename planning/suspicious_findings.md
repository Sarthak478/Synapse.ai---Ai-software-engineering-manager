# Suspicious Findings & Security Risks

During the initial project scan, the following suspicious or potentially insecure patterns were identified:

## 1. Plain Text Passwords - FIXED
- **Status:** Fixed in `server/db/stateManager.ts`, `server/routes/auth.ts`, `server/routes/state.ts`
- **Fix Applied:**
  - All passwords are now hashed with **bcrypt** (salt rounds = 10) before storage.
  - On startup, `getState()` auto-migrates any plain-text password in `db.json` to a bcrypt hash.
  - Login now uses `bcrypt.compareSync()` for timing-safe comparison.
  - New developer creation and password changes are hashed before writing to disk.

## 2. Hardcoded Credentials / Information Disclosure
- **Location:** `server/routes/auth.ts` line ~22
- **Status:** TESTING PHASE ACCEPTED RISK - Kept as inline code comment reminder.
- **Details:** Login error message hints at demo credentials (`alice` / `password123`).
- **Action Required Before Production:** Remove the hint from the error message and implement a proper onboarding flow for new developers.

## 3. Client-Side API Key Header Trust - FIXED
- **Status:** Fixed in `server/routes/gemini.ts`
- **Fix Applied:**
  - A `isValidGeminiKeyFormat()` validator rejects any `x-gemini-api-key` header that doesn't start with `AIza` or is shorter than 35 characters.
  - Malformed/invalid keys are silently discarded; the server falls back to the `.env` key only.
  - On the **client side**, all 5 AI feature components now gate their triggers behind `state.settings.hasGeminiApiKey`. If no key is configured, an `ApiKeyRequiredModal.tsx` appears prompting the user to go to Settings.

## 4. Hardcoded Mock Responses
- **Location:** `server/routes/gemini.ts` - all 4 endpoints
- **Status:** TESTING PHASE ACCEPTED RISK - Kept as inline `TESTING PHASE REMINDER` code comments.
- **Details:** When the Gemini API key is missing, all endpoints return hardcoded simulation data. Clients now see the API key modal before hitting these endpoints, so mock data is no longer silently used without user awareness.
- **Action Required Before Production:** Remove all `isMock` branches and mock return blocks from `gemini.ts`. Make a configured `GEMINI_API_KEY` mandatory in `.env`.

## 5. Potential API Key Leakage in State Sync - FIXED
- **Status:** Fixed in `server/routes/state.ts` and `server/db/stateManager.ts`
- **Fix Applied:**
  - **Client responses:** `buildSafeDevRecord()` function uses an explicit `CLIENT_SAFE_DEV_FIELDS` allowlist. No field outside this list can be sent to clients, regardless of what gets added to developer objects in the future.
  - **Disk writes:** `sanitizeDevForDisk()` in `stateManager.ts` uses a matching `DEV_DISK_FIELDS` allowlist. `personalCredentials` is always forced to `{}` before writing.
  - The old pattern of "spread all fields then delete a few" has been fully replaced.

## 6. Raw Gemini Key Transit in Client Save Flow
- **Location:** `client/src/App.tsx`, `client/src/components/Sidebar.tsx`, `server/routes/state.ts`
- **Status:** Informational / acceptable for the current demo architecture
- **Details:** The UI submits the raw Gemini key once during settings save so the server can persist an encrypted copy. The client only keeps a hash for presence checks.
- **Why it matters:** Better than storing the raw key in localStorage, but the secret still crosses the client/server boundary during save.
- **Future hardening idea:** Replace the current save flow with a one-time encrypted upload or secure server-side secret capture so the raw key is never re-sent after entry.

## 7. Hardcoded Branding / Demo Identity Values
- **Location:** `client/src/App.tsx`, `client/src/components/Sidebar.tsx`, `README.md`
- **Status:** Informational
- **Details:** A few UI strings still contain fixed account identity text and product branding placeholders.
- **Why it matters:** This can confuse operators in multi-user deployments if they expect dynamic identity rendering.

## 8. Shared-State Drift in Repo Intelligence - FIXED
- **Status:** Fixed in `client/src/App.tsx`, `client/src/stateSync.ts`, `server/routes/state.ts`, `server/db/stateManager.ts`, `server/db/models.ts`
- **Fix Applied:**
  - Repository links are now persisted as workspace-shared server state instead of being isolated to each member's browser cache.
  - Client merge logic now intentionally trusts the server's repository list and ignores stale local cached copies.
  - Shared repositories can be removed so outdated links do not accumulate.

## 9. Repo Analysis Database Detection Drift - FIXED
- **Status:** Fixed in `server/routes/gemini.ts` and covered by `server/routes/repoAnalysis.test.mjs`
- **Details:** Database ecosystem summaries could previously mention MongoDB even when the scanned project only evidenced Redis.
- **Fix Applied:** Database normalization now removes MongoDB unless the repository evidence actually supports it.
