# Project Overview: Synapse Enterprise Gateway (AI Software Engineering Manager)

## Architecture
- **Frontend:** React, Vite, Tailwind CSS, Lucide React icons, Framer Motion.
- **Backend:** Node.js, Express, TypeScript.
- **Database:** MongoDB via Mongoose, with workspace state assembled in `server/db/stateManager.ts`.
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

## Observed Product Surface
- **Core tabs currently wired in the app:** Dashboard, Repo Intelligence, Sprint Planner, Code Reviewer, Team Analytics, PM Assistant, and Daily Standups.
- **Additional UI modules present in the codebase:** `DeploymentPipeline`, `RiskHeatmap`, `SprintRetrospective`, and `ArchitectureGraph`. These appear to be supporting views/components even if they are not all wired into the primary tab bar yet.
- **Auth flows:** Workspace registration, login, forgot-password recovery passcodes, and master recovery-key recovery for the Team Head are implemented in `server/routes/auth.ts`.
- **Jira support:** The backend has both live and sandbox Jira issue creation/fetching, plus an environment-config check endpoint.
- **Settings model:** Client and server both handle project-scoped API key state, developer profiles, and secure state sync with sanitization.
- **Shared Repo Intelligence state:** Linked repositories are workspace-level data rather than per-user-only browser data.

## Design Patterns
- **Optimistic UI Updates:** Client saves to local storage and updates state immediately before syncing with server.
- **Split persistence model:** Shared team state lives on the server, while private user working context stays in browser storage.
- **Mock/Simulation Fallback:** If API keys (Gemini, Jira) are missing, the backend returns detailed, hardcoded simulated responses to keep the app functional for demos.
