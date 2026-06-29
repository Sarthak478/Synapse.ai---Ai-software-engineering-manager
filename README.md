<div align="center">
  <h1>🧠 Synapse.ai — AI Software Engineering Manager</h1>
  <p><strong>Your autonomous, AI-driven project management and engineering leadership platform.</strong></p>

</div>

<hr />

## 🌟 Overview

**Synapse.ai** is an AI-powered engineering management platform that simulates full-scale repository intelligence, interactive architecture mapping, AI pull request reviews, technical debt tracking, automagic standups, automated sprint planning, workload balancing, and smart timeline forecasting. 

Built on top of **Google's Gemini AI**, it acts as a virtual Engineering Manager and Product Manager, reducing operational overhead and letting your developers focus on what they do best: writing code.

---

## ✨ Key Features

- 📅 **AI Sprint Planner**: Input raw product demands (e.g., *"build a user profile page"*), and the AI automatically generates tickets, estimates story points, and assigns them to the best-fit developers based on their skills and current workload.
- 🔍 **AI Code Reviewer**: Run automated code audits to detect security vulnerabilities (e.g., SQL injections), architectural bottlenecks, and logic flaws before they reach production.
- 📊 **Team Analytics & Morale Sentinel**: Monitor developer velocity, workload balance, and use AI to synthesize daily standups into early-warning burnout and morale reports.
- 📂 **Repository Intelligence**: Automatically scan GitHub/GitLab codebases. The AI infers the technology stack and generates a visual, interactive architecture graph of your services and dependencies.
- 🤖 **PM Assistant (Chat)**: Talk directly to your virtual Project Manager. Ask for bottleneck analysis, critical path summaries, and sprint health reports in natural language.
- 🛡️ **Secure by Default**: Features bcrypt password hashing, strict API key format validation, and safe state-sync sanitization to prevent data leakage.

---

## 🛠️ Technology Stack

**Frontend:**
- [React 18](https://reactjs.org/) & [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) for sleek, modern, responsive styling
- [Motion (Framer Motion)](https://motion.dev/) for fluid micro-animations
- [Recharts](https://recharts.org/) for interactive data visualizations
- [Lucide React](https://lucide.dev/) for beautiful typography and icons

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/) for end-to-end type safety
- [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) for direct Gemini LLM integration
- Local JSON Database (`db.json`) for seamless testing and state management

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A **Google Gemini API Key** (Get one at [Google AI Studio](https://aistudio.google.com/))

### 1. Clone the repository
```bash
git clone https://github.com/Sarthak478/Synapse.ai---Ai-software-engineering-manager.git
cd Synapse.ai---Ai-software-engineering-manager
```

### 2. Install Dependencies
Install the required packages (this covers both the root workspace and client/server workspaces if running concurrently, but specifically requires bcryptjs for security):
```bash
npm install
npm install bcryptjs @types/bcryptjs
```

### 3. Environment Configuration
Create a `.env` file at the root of the project (you can copy `.env.example`):
```bash
cp .env.example .env
```
Open your new `.env` file and add your Gemini API Key:
```env
GEMINI_API_KEY="your_api_key_here"
```
*(Note: You can also dynamically add the API key via the Team Settings UI once the app is running!)*

### 4. Run the Application
Start the development server (this will run both the Express backend and the Vite frontend concurrently):
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or whichever port Vite assigns).

---

## 🔒 Security Notes
During development, ensure that your `GEMINI_API_KEY` is never committed to version control. The `.gitignore` is already configured to ignore `.env` files. 

Passwords stored in the local `db.json` are heavily encrypted using `bcrypt` (Salt Rounds: 10), and client-state synchronization strips all sensitive fields before transmitting payload data to the browser.
