import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { getState, decryptKey } from "../db/stateManager.js";
import { Developer } from "../db/models.js";
import { normalizeDatabases } from "./repoAnalysis.js";
import { getWorkspaceIdForDev } from "./workspaceAccess.js";

const router = Router();

/**
 * SECURITY FIX #3: Validate Gemini API key format before trusting any client-supplied key.
 * A real Gemini key starts with "AIza" and is at least 35 characters long.
 * Any header key that fails this check is silently discarded; only the server's
 * environment key (GEMINI_API_KEY) is used as a trusted fallback.
 *
 * ⚠️ TESTING PHASE REMINDER: When moving to production, make GEMINI_API_KEY mandatory
 * and remove mock/simulation fallbacks from all endpoints below.
 */
function isValidGeminiKeyFormat(key: string): boolean {
  const trimmed = key.trim();
  return (trimmed.startsWith("AIza") || trimmed.startsWith("AQ")) && trimmed.length >= 35;
}

// Middleware to dynamically check and bind the transient Gemini API Client
// SECURITY: The raw API key is read from the server's DB or env var.
// It is NEVER accepted from a client-side header.
router.use(async (req: any, res, next) => {
  const envKey = process.env.GEMINI_API_KEY;

  let resolvedKey: string | null = null;

  // 1. Try the environment variable first (highest trust)
  if (envKey && isValidGeminiKeyFormat(envKey)) {
    resolvedKey = envKey.trim();
  }

  // 2. Fall back to the key stored server-side in DB
  if (!resolvedKey) {
    try {
      const dev = await Developer.findOne({ id: req.userDevId }).lean();
      if (dev) {
        const dbState = await getState(dev.workspaceId);
        const rawEncryptedKey = dbState.settings?.geminiApiKeyEncrypted || "";
        console.log(`[Gemini] DB key lookup: workspace=${dev.workspaceId}, encLen=${rawEncryptedKey.length}, hash=${(dbState.settings?.geminiApiKeyHash || "").substring(0, 8)}...`);
        const dbKey = decryptKey(rawEncryptedKey);
        console.log(`[Gemini] Decrypted key: len=${dbKey.length}, valid=${dbKey ? isValidGeminiKeyFormat(dbKey) : false}`);
        if (dbKey && isValidGeminiKeyFormat(dbKey)) {
          resolvedKey = dbKey.trim();
        }
      } else {
        console.log(`[Gemini] No developer found for id: ${req.userDevId}`);
      }
    } catch (e) {
      console.error("[Gemini] Failed to read API key from DB:", e);
    }
  }

  console.log(`[Gemini] Key resolved: ${resolvedKey ? "YES" : "NO"}`);

  if (resolvedKey) {
    req.ai = new GoogleGenAI({
      apiKey: resolvedKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } else {
    req.ai = null;
  }
  next();
});

// Helper to construct secure request-specific project context state dynamically
const getContextState = async (req: any) => {
  const workspaceId = await getWorkspaceIdForDev(req.userDevId);
  const dbState = await getState(workspaceId);
  const incomingState = req.body.state || {};
  return {
    developers: dbState.developers || incomingState.developers || [],
    repositories: incomingState.repositories || [],
    tasks: incomingState.tasks || [],
    sprints: incomingState.sprints || [],
    standups: incomingState.standups || [],
    chats: incomingState.chats || []
  };
};

// Gemini Repository Analysis Core Proxy
router.post("/analyze-repo", async (req: any, res) => {
  const { url, description, name } = req.body;

  if (!url || !description) {
    return res.status(400).json({ error: "Repository URL and Description are required." });
  }

  let githubInfo = "";
  if (url.includes("github.com")) {
    try {
      const parts = url.split("github.com/")[1].split("/");
      if (parts.length >= 2) {
        const owner = parts[0];
        const repo = parts[1].replace(".git", "");
        
        // Fetch languages
        const langRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`);
        if (langRes.ok) {
          const langs = await langRes.json();
          githubInfo += `\n- GitHub Languages: ${Object.keys(langs).join(", ")}`;
        }
        
        // Try fetching package.json
        const pkgRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/package.json`);
        if (pkgRes.ok) {
          const pkg = await pkgRes.json();
          const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          githubInfo += `\n- package.json Dependencies: ${Object.keys(allDeps).join(", ")}`;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch github info", e);
    }
  }

  const prompt = `
  You are an AI Repository Architect. Based STRICTLY on the following repository info, perform a comprehensive software architecture and code analysis.
  Repository Name: "${name || 'Unknown Repo'}"
  Repository URL: "${url}"
  Description: "${description}"
  ${githubInfo ? `\nReal GitHub Data Extracted:\n${githubInfo}\n` : ""}

  CRITICAL RULES:
  - Base your tech stack strictly on the Real GitHub Data Extracted (if provided), or infer from the description.
  - If package.json dependencies are listed, correctly categorize them (e.g., 'express' -> Node.js Backend, 'react' -> React Frontend, 'mongoose' -> MongoDB).
  - Do not list MongoDB unless the description or dependencies explicitly mention MongoDB, mongoose, or mongo.
  - If Redis, ioredis, Bull, or queue/cache dependencies are present, list Redis as cache/message infrastructure in "databases"; do not convert Redis into MongoDB.
  - Do not hallucinate completely unrelated technologies, but do infer the architectural stack based on the provided dependencies and languages.

  Analyze and output a JSON schema with the exact format:
  {
    "stack": ["Technology 1", "Technology 2"],
    "modules": [
      { "name": "Module Name/Path", "type": "e.g. gateway, frontend, auth, backend, worker", "description": "Short description of what this module does.", "deps": ["Dep Module Name"] }
    ],
    "apis": [
      { "path": "endpoint e.g. /api/users", "method": "GET/POST/PUT/DELETE", "description": "precise detail" }
    ],
    "databases": ["Database Name"],
    "architecture": {
      "nodes": [
        { "id": "unique-id", "label": "Human Readable Label", "type": "frontend|gateway|service|database", "x": 100, "y": 150 }
      ],
      "edges": [
        { "from": "node-id-1", "to": "node-id-2", "label": "e.g. REST API, WebSocket, TCP" }
      ]
    }
  }

  For the coordinates, design a clean flow from left to right:
  - Frontend: x around 100, y evenly spaced (100, 250...)
  - Gateway: x around 300, y around 180
  - Services: x around 500, y evenly spaced (80, 200, 320...)
  - Database/Infrastructure: x around 700, y evenly spaced (150, 280...)
  Do not use any markdown tags outside of the pure valid JSON string. Do not wrap in backticks or markdown, start and end with curly braces. Ensure proper JSON formatting.
  `;

  try {
    if (!req.ai) {
      return res.status(400).json({ error: "Gemini API key is not configured. Please add a valid API key in Settings to enable AI-powered repository analysis." });
    }

    const response = await req.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    parsedData.databases = normalizeDatabases(parsedData.databases || [], description, githubInfo);
    res.json(parsedData);
  } catch (err: any) {
    console.error("Error connected to Gemini AI:", err);
    res.status(500).json({ error: "Could not execute Gemini stack analysis. " + err.message });
  }
});

// Gemini Sprint Planning Proxy
router.post("/plan-sprint", async (req: any, res) => {
  const { requirements } = req.body;
  const state = await getContextState(req);

  if (!requirements) {
    return res.status(400).json({ error: "Sprint planning requirements are required." });
  }

  const prompt = `
  You are an expert Agile Scrum AI Project Manager. Take these sprint raw project requirements:
  "${requirements}"

  Given the current developer roster:
  ${JSON.stringify(state.developers, null, 2)}

  Draft an immediate Sprint Plan consisting of clear granular Tasks. Break the key requested deliverables down into 3-5 distinct project tasks with accurate story points (1, 2, 3, 5, 8).
  Assign tasks intelligently, matching developer skills perfectly. Avoid over-allocating points beyond their velocities.
  Identify complex dependencies (what is blocked by what).
  Determine a completion confidence rate (0-100) and identify delay risks or workload bottlenecks.

  Optimize the response. Output exactly as a JSON schema of the format:
  {
    "tasks": [
      {
        "id": "gen-task-1",
        "title": "Clear action-driven title",
        "description": "Exhaustive description of technical specs",
        "priority": "low|medium|high|critical",
        "storyPoints": 3,
        "assignedTo": "dev-1", // Must strictly match the 'id' of a dev in our list of developers
        "skillsRequired": ["React", "Express"], // relevant skilled list
        "blockedBy": [], // arrays of generated task ids if there is an architectural queue
        "subtasks": [
          { "id": "gen-sub-1", "title": "Sub task checkpoint", "done": false }
        ]
      }
    ],
    "predictedCompletionProbability": 82, // percentage confidence
    "delays": [
      { "taskId": "gen-task-2", "risk": "medium|high", "reason": "Explain why this risk exists due to assignment or tooling" }
    ],
    "suggestions": [
      "Agile workflow resource balancing advice to critical paths"
    ]
  }

  Avoid outputting any markdown strings or backticks. Only return pure valid JSON. Start with { and end with }.
  `;

  try {
    if (!req.ai) {
      return res.status(400).json({ error: "Gemini API key is not configured. Please add a valid API key in Settings to enable AI-powered sprint planning." });
    }

    const response = await req.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const plan = JSON.parse(response.text || "{}");
    res.json(plan);
  } catch (err: any) {
    console.error("Sprint Planning Gemini Error:", err);
    res.status(500).json({ error: "Could not compile sprint planning proposal. " + err.message });
  }
});

// Gemini AI Code Review Core Proxy
router.post("/review-code", async (req: any, res) => {
  const { fileName, codeSnippet } = req.body;

  if (!codeSnippet) {
    return res.status(400).json({ error: "Code snippet is required." });
  }

  const prompt = `
  You are an elite Staff Security & Performance Code Reviewer. Audit the following file and snippet:
  File Name: "${fileName || "index.ts"}"
  Code Snippet:
  \`\`\`
  ${codeSnippet}
  \`\`\`

  Analyze this source code for code smells, potential logic/runtime bugs, serious security vulnerabilities (OWASP Top 10), performance drags, and duplications.
  Compute a precise overall Code Quality Score (0-100) where:
  - 90-100: Excellent, production grade.
  - 70-89: Good, needs minor styling or optimization.
  - 50-69: Moderate, contains code smells or duplicate layers.
  - <50: Critical security or logic risks!

  Provide exact annotations mapping to critical issue lines in the text, together with standard suggestions and a clean, perfectly optimized/refactored drop-in replacement snippet.

  Format the output exactly as a JSON string:
  {
    "qualityScore": 68,
    "issues": [
      {
        "type": "smell|vulnerability|performance|duplicate",
        "severity": "low|medium|high",
        "message": "Direct message detail explaining the file bug",
        "line": 4, // 1-indexed relative line number inside the provided snippet, or approximate
        "suggestion": "Detailed refactor suggestions"
      }
    ],
    "summary": "High-level review summary paragraph",
    "optimizedCode": "Perfect refactored ESM TypeScript equivalent snippet matching best practices"
  }

  Ensure pure legal JSON format, do not contain markup backticks, and ensure the optimizedCode is a properly escaped single line or has standard JSON newline characters. Keep it clean!
  `;

  try {
    if (!req.ai) {
      return res.status(400).json({ error: "Gemini API key is not configured. Please add a valid API key in Settings to enable AI-powered code reviews." });
    }

    const response = await req.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsedReview = JSON.parse(response.text || "{}");
    res.json(parsedReview);
  } catch (err: any) {
    console.error("AI Code Review Error:", err);
    res.status(500).json({ error: "AI Review Engine failed. " + err.message });
  }
});

// Gemini PM Chat & Natural Language Queries Proxy
router.post("/chat", async (req: any, res) => {
  const { message } = req.body;
  const state = await getContextState(req);

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const contextPrompt = `
  You are an AI Software Engineering Manager Assistant, a strategic engineering coordinator embedded with the crew.
  Your main duty is to answer questions, report sprint health, evaluate developer workloads, warn about bottleneck blocks, or suggest tactical fixes based on the real-time project state.

  Here is the CURRENT state of our Software team:
  ===========================================
  1. Developers Roster:
  ${JSON.stringify(state.developers, null, 2)}

  2. Project Repositories scanned:
  ${JSON.stringify(state.repositories, null, 2)}

  3. Sprint Backlog & Kanban Status:
  ${JSON.stringify(state.tasks, null, 2)}

  4. Current Active Sprints:
  ${JSON.stringify(state.sprints, null, 2)}
  ===========================================

  Analyse that state objectively. Answer questions in a helpful, concise, engineering-focused tone. 
  If asked about workloads or Bottlenecks, refer back directly to the actual story points and task names in our data!
  Use the real developer names, task titles, and story points from the data above. Do NOT reference any developers or tasks that are not present in the current state.
  Suggest explicit corrective actions. Keep responses friendly, elegant, and highly structured (use lists and markdown bold states as proper scannable rhythms).

  User query: "${message}"
  `;

  try {
    if (!req.ai) {
      return res.status(400).json({ error: "Gemini API key is not configured. Please add a valid API key in Settings to enable the AI PM Assistant." });
    }

    const response = await req.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contextPrompt
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("AI Engineering Manager Chat error:", err);
    res.status(500).json({ error: "AI Manager could not respond. " + err.message });
  }
});

// Gemini Team Morale & Burnout Safe-Guard Analysis Proxy
router.post("/morale-check", async (req: any, res) => {
  const state = await getContextState(req);

  const prompt = `
  You are an expert Engineering Psychologist and Agile AI Scrum Master. Analyze the current state of our software development crew to assess morale, sentiment, and burnout risks.
  
  Here is the CURRENT state of our team:
  ===========================================
  1. Developers Roster:
  ${JSON.stringify(state.developers, null, 2)}

  2. Sprint Backlog & Kanban Task Status:
  ${JSON.stringify(state.tasks, null, 2)}

  3. Daily Standups:
  ${JSON.stringify(state.standups, null, 2)}
  ===========================================

  Analyse the workload points relative to their velocity limits. Use the real developer names, task titles, and numbers from the data above. Do NOT reference any developers or tasks that are not present in the current state. Identify who is under pressure, blocked, stressed, or underutilized.
  
  Generate a comprehensive Morale & Burnout Report. Output exactly as a JSON schema of the format:
  {
    "teamSentimentScore": 78, // Overall team health index out of 100
    "teamSentimentStatus": "Focused but Constrained", // 2-4 word high level state
    "developerMorale": [
      {
        "id": "dev-1", // Must match a developer's ID
        "name": "Developer Name",
        "burnoutScore": 45, // Burnout probability out of 100
        "status": "Low Risk|Moderate Risk|High Burnout Risk",
        "mood": "Focused|Anxious|Blocked|Overloaded|Calm",
        "narrative": "Explain their situation, highlighting active tasks, velocity strain, and standup status."
      }
    ],
    "recommendations": [
      "Explicit actionable step to relieve pressure, resolve a blocker, or run task re-allocations."
    ]
  }

  For any developer not specifically mentioned in the standups, estimate their metrics sensibly based on their tasks and contributions.
  Do not contain any markdown tags, backticks or formatting outside the valid JSON object string. Ensure proper escaping.
  `;

  try {
    if (!req.ai) {
      return res.status(400).json({ error: "Gemini API key is not configured. Please add a valid API key in Settings to enable AI-powered morale analysis." });
    }

    const response = await req.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("Morale Check Gemini Error:", err);
    res.status(500).json({ error: "Could not compile morale and sentiment diagnostic. " + err.message });
  }
});

export default router;
