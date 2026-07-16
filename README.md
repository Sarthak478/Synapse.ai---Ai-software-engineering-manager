# Synapse.ai - AI Software Engineering Manager

Synapse.ai is an AI-assisted engineering management workspace for sprint planning, repository analysis, code review, standups, team analytics, and project-risk visibility.

## Stack

Frontend:
- React 19 and Vite
- Tailwind CSS
- Motion
- Recharts
- Lucide React

Backend:
- Node.js, Express, and TypeScript
- MongoDB with Mongoose
- Google GenAI SDK for Gemini-backed features
- bcrypt password hashing
- Server-side encrypted Gemini API key storage

## Local Setup

Install dependencies separately:

```bash
cd server
npm install

cd ../client
npm install
```

Create the backend environment file:

```bash
cd server
copy .env.example .env
```

Set at minimum:

```env
MONGODB_URI="your_mongodb_connection_string_here"
JWT_SECRET="a_random_secret_at_least_32_chars_long"
DATA_ENCRYPTION_SECRET="another_random_secret_at_least_32_chars_long"
APP_URL="http://localhost:3000"
GEMINI_API_KEY="optional_server_level_gemini_key"
```

Run the app in two terminals:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

The client runs on `http://localhost:3000` and proxies API requests to the server on `http://localhost:3001`.

## Verification

Run these before merging or deploying:

```bash
cd server
npm run lint
npm test
npm run build
npm audit --omit=dev

cd ../client
npm run lint
npm test
npm run build
npm audit --omit=dev
```

## Production Requirements

Production deployments must provide:

- `NODE_ENV=production`
- `MONGODB_URI`
- `JWT_SECRET` with at least 32 characters
- `DATA_ENCRYPTION_SECRET` with at least 32 characters, or a strong `JWT_SECRET` reused for encryption
- `APP_URL` or `CORS_ORIGINS` for CORS allowlisting

The server intentionally fails fast in production if required security settings are missing.

## Security Notes

> For a detailed, comprehensive overview of our implemented security measures and active architectural roadmap, please read the [Synapse Security Hardening Documentation](file:///d:/ai-software-engineering-manager/planning/security_hardening.md).

- Passwords are hashed with bcrypt before storage.
- Session tokens are HMAC-signed and production requires an explicit strong `JWT_SECRET`.
- Stored Gemini and Resend API keys are encrypted server-side with `aes-256-gcm`.
- Account recovery uses a Hybrid Email System: secure, time-bound JWT reset links via Resend API, with a seamless air-gapped passcode fallback if not configured.
- Client state responses strip password hashes and personal credentials.
- Production CORS is allowlisted.
- Auth and AI routes have request rate limits.
- Production responses include hardened browser security headers.
