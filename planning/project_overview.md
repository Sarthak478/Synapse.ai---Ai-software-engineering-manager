# Project Overview: Synapse Enterprise Gateway (AI Software Engineering Manager)

## Architecture
- **Frontend:** React, Vite, Tailwind CSS, Lucide React icons, Framer Motion.
- **Backend:** Node.js, Express, TypeScript.
- **Database:** Local JSON file based state management (`server/db/stateManager.ts`).
- **AI Integration:** `@google/genai` (Gemini API) used for various PM and development tasks.

## Key Directories
- `client/`: Contains the Vite + React frontend code.
  - `src/components/`: UI components for different tabs (Dashboard, Repos, Sprints, etc.).
  - `src/App.tsx`: Main routing and layout, local storage state sync.
- `server/`: Contains the Express backend.
  - `server.ts`: Entry point, sets up Vite middleware for dev or serves static build for prod.
  - `routes/`: Contains API endpoints (`auth.ts`, `gemini.ts`, `jira.ts`, `state.ts`).
  - `middlewares/`: Security and authentication middlewares.
  - `db/`: State management using local JSON.

## Design Patterns
- **Optimistic UI Updates:** Client saves to local storage and updates state immediately before syncing with server.
- **Mock/Simulation Fallback:** If API keys (Gemini, Jira) are missing, the backend returns detailed, hardcoded simulated responses to keep the app functional for demos.
