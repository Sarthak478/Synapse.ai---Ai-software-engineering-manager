# Synapse Security Hardening Documentation

This document tracks the phased security hardening implementations for the Synapse.ai workspace platform. 

## Completed Phases

### Phase 1: Core Patching
- **Stateless Tokens**: Deprecated `localStorage` JWTs in favor of `HttpOnly` cookies.
- **Passcode Hashing**: Swapped `Math.random` out for `crypto.randomInt` and applied bcrypt to temporary recovery passcodes.
- **Enumeration Prevention**: Enforced token authentication on developer roster listings.

### Phase 2: System Defense & Access Control
- **CSRF & Rate Limiting**: Added strict `Origin` and `Referer` checks (`csrfProtection`) on mutating state routes. Added `authRateLimit` and `aiRateLimit` on vulnerable endpoints.
- **Memory Exhaustion (DoS)**: Restricted Express JSON payload parsers to `100kb` globally, and `5mb` exclusively on state-saving boundaries.
- **NoSQL Injection**: Implemented explicit type checking (`typeof === 'string'`) in document lookups.
- **Account Lockout**: Hardened the authentication matrix with a 5-failure account lockout (15 minutes).
- **Session Revocation**: Bound authentication payloads to an iterating `sessionVersion` that revokes active sessions if a password is systematically reset.
- **Prompt Injection Defense**: AI API queries now escape HTML payloads and securely separate user input through the `systemInstruction` configurations.
- **Client Integrity**: Applied standard `crossorigin="anonymous"` and `preconnect` values to third-party web fonts.
- **Audit Logging**: Created an immutable `auditLogs` stream within `Settings` to securely record authentication anomalies and resets.

### Phase 3: Field-Level Credentials Encryption
- **Encrypted at Rest**: Re-engineered the backend state manager to explicitly capture and apply `aes-256-gcm` encryption to personal developer credentials (e.g. Jira / GitHub Tokens) prior to MongoDB insertion.
- **Data Scoping**: Redefined API response payloads to ensure decrypted personal credentials are only visible to the specific session holder that owns them.

### Phase 4: Password Anti-Reuse History
- **Historical Hashing**: Introduced a `passwordHistory` array into the `Developer` schema.
- **Enforcement**: Resets via `/api/auth/recover-master` and `/api/state/save` require a bcrypt evaluation against the active password and the last 3 historical hashes to prevent trivial password toggling.

---

### Phase 6: Hybrid Email Recovery System
- **Resend Integration**: Integrated `resend` API with robust AES-256-GCM encryption for storing API keys.
- **Forced Resets**: Implemented `mustResetPassword` flag enforcing new users to set their own passwords upon first login.
- **Time-bound JWTs**: Created stateless, time-bound JWT tokens (15 mins for resets, 72 hours for initial setup) for secure one-click actions.
- **Graceful Fallback**: If a Head does not configure email keys, the system transparently falls back to the manual passcode recovery UI.

---

## Upcoming / Planned Enhancements

### Phase 5: Multi-Factor Authentication (MFA)
- Time-based One Time Password (TOTP) enforcement for Team Heads and elevated accounts.
