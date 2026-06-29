# Features

The application is an AI-powered Software Engineering Manager dashboard that assists teams in managing projects. It consists of the following key features / tabs:

## 1. Dashboard Overview (`DashboardOverview`)
- High-level view of sprint progress, team capacity, and recent activities.

## 2. Repo Intelligence (`RepoIntelligence`)
- **Endpoint:** `POST /api/gemini/analyze-repo`
- **Functionality:** Scans a repository and provides a comprehensive software architecture and code analysis (stack, modules, APIs, databases) using Gemini.

## 3. Sprint Planner (`SprintPlanner`)
- **Endpoint:** `POST /api/gemini/plan-sprint`
- **Functionality:** Takes project requirements and current developer rosters to draft an immediate Sprint Plan with tasks, story points, assignee recommendations, and dependency tracking.

## 4. Code Reviewer (`CodeReviewer`)
- **Endpoint:** `POST /api/gemini/review-code`
- **Functionality:** Audits code snippets for code smells, bugs, security vulnerabilities (OWASP), and performance issues. Provides a code quality score and a refactored snippet.

## 5. Team Analytics / Morale Check (`TeamAnalytics`)
- **Endpoint:** `POST /api/gemini/morale-check`
- **Functionality:** Analyzes the workload points vs velocity limits of the development team to assess morale, sentiment, and burnout risks. Recommends load shedding or reassignment.

## 6. PM Assistant / Chat (`PMAssistant`)
- **Endpoint:** `POST /api/gemini/chat`
- **Functionality:** A conversational AI assistant that answers questions, reports sprint health, and evaluates developer workloads using the current state of the database.

## 7. Daily Standups (`DailyStandups`)
- Interface for developers to log their daily updates and blockers.

## 8. Jira Integration
- **Endpoints:** `POST /api/jira/create-issue`, `POST /api/jira/fetch-issues`
- **Functionality:** Connects to a Jira workspace to create issues or fetch them. Contains a sandbox mode for simulation if credentials are not configured.

## 9. Authentication & State Sync
- Custom token-based authentication.
- State is merged between client local storage and the server JSON store (`server/db/stateManager.ts`).
