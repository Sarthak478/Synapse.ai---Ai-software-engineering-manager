import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { getState } from "../db/stateManager.js";

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
router.use((req: any, res, next) => {
  const headerKey = req.headers["x-gemini-api-key"] as string | undefined;
  const envKey = process.env.GEMINI_API_KEY;

  // Prefer a valid client-supplied header key, then fall back to the environment key
  let resolvedKey: string | null = null;

  if (headerKey && headerKey.trim() !== "" && headerKey !== "configured (masked for security)") {
    if (isValidGeminiKeyFormat(headerKey)) {
      resolvedKey = headerKey.trim();
    } else {
      // Invalid format — reject it silently and fall back to env key
      console.warn("[Security] Rejected malformed x-gemini-api-key header from client.");
    }
  }

  if (!resolvedKey && envKey && isValidGeminiKeyFormat(envKey)) {
    resolvedKey = envKey.trim();
  }

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
  const dbState = await getState();
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

  const prompt = `
  You are an AI Repository Architect. Based on the following repository info, perform a comprehensive software architecture and code analysis.
  Repository Name: "${name || 'Microservice Hub'}"
  Repository URL: "${url}"
  Description: "${description}"

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
        { "from": "node-id-1", "to": "node-id-2", "label": "e.g. REST API, TCP, SSL" }
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
    const isMock = !req.ai;
    if (isMock) {
      // Return a simulated high-quality scan when API Key is missing so app remains perfectly operational
      const simulatedScan = {
        stack: ["React", "TypeScript", "Tailwind CSS", "Go", "GraphQL", "MongoDB"],
        modules: [
          { name: "Apollo GraphQL Core", type: "gateway", description: "Centralized GraphQL federated gateway handling incoming client schemas.", deps: [] },
          { name: "Frontend Visual Board", type: "frontend", description: "React-based Single Page Application providing interactive visualizations.", deps: ["Apollo GraphQL Core"] },
          { name: "Inventory Dispatcher", type: "business-logic", description: "Go-lang backend validating and dispatching real-time inventory queues.", deps: ["Apollo GraphQL Core"] },
          { name: "Billing Engine", type: "business-logic", description: "Node.js engine processing credit transactions and user invoices.", deps: ["Apollo GraphQL Core"] }
        ],
        apis: [
          { path: "/query", method: "POST", description: "GraphQL main endpoint for visual widgets" },
          { path: "/inventory/reserve", method: "PUT", description: "Atomic locking of cart contents" }
        ],
        databases: ["MongoDB Shared Server"],
        architecture: {
          nodes: [
            { id: "scanned-front", label: "Client Client SPA\n(React TS)", type: "frontend", x: 100, y: 150 },
            { id: "scanned-gate", label: "Apollo GraphQL Gateway", type: "gateway", x: 300, y: 150 },
            { id: "scanned-srv-1", label: "Inventory Worker\n(Go Lang)", type: "service", x: 500, y: 80 },
            { id: "scanned-srv-2", label: "Billing Dispatcher\n(Node.js)", type: "service", x: 500, y: 220 },
            { id: "scanned-db", label: "Inventory Storage\n(MongoDB)", type: "database", x: 700, y: 150 }
          ],
          edges: [
            { from: "scanned-front", to: "scanned-gate", label: "Query/Mutation" },
            { from: "scanned-gate", to: "scanned-srv-1", label: "gRPC payload" },
            { from: "scanned-gate", to: "scanned-srv-2", label: "gRPC dispatch" },
            { from: "scanned-srv-1", to: "scanned-db", label: "Mongoose Query" }
          ]
        }
      };
      return res.json(simulatedScan);
    }

    const response = await req.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
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
    const isMock = !req.ai;
    if (isMock) {
      // Simulated response when API key is unconfigured
      const simulatedPlan = {
        tasks: [
          {
            id: `task-gen-${Date.now()}-1`,
            title: "Build OAuth Secure Connection Route",
            description: "Integrate multi-tenant Google Workspace authentication API. Establish solid session storage structures inside active passport scopes.",
            priority: "critical" as const,
            storyPoints: 5,
            assignedTo: "dev-2",
            skillsRequired: ["Node.js", "APIs"],
            blockedBy: [],
            subtasks: [
              { id: "sub-g1-1", title: "Setup client parameters and OAuth scopes", done: false },
              { id: "sub-g1-2", title: "Compose encryption routines on local cookies", done: false }
            ]
          },
          {
            id: `task-gen-${Date.now()}-2`,
            title: "OAuth Landing Gate & Account Hub UI Component",
            description: "Design reactive state dashboards that support multiple login paths. Embed secure visual widgets with Tailwind style profiles.",
            priority: "high" as const,
            storyPoints: 3,
            assignedTo: "dev-3",
            skillsRequired: ["React", "Tailwind CSS"],
            blockedBy: [`task-gen-${Date.now()}-1`],
            subtasks: [
              { id: "sub-g2-1", title: "Import login routes from auth state", done: false },
              { id: "sub-g2-2", title: "Framer animations on profile panels", done: false }
            ]
          }
        ],
        predictedCompletionProbability: 91,
        delays: [
          {
            taskId: `task-gen-${Date.now()}-2`,
            risk: "medium" as const,
            reason: "Design task-2 is blocked by OAuth controller integration handled by Bob. Any delay there sets this UI element back."
          }
        ],
        suggestions: [
          "Encourage early mocking of OAuth endpoints inside React client so Diana can automate flow audits sooner.",
          "Shift Alice to assist on security parameters if Diana becomes overallocated."
        ]
      };
      return res.json(simulatedPlan);
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
    const isMock = !req.ai;
    if (isMock) {
      // Mock review response for offline fallback
      const simulatedReview = {
        qualityScore: 62,
        issues: [
          {
            type: "vulnerability" as const,
            severity: "high" as const,
            message: "Usage of dangerous eval() or unsafe sql binding. The code risks injection vectors.",
            line: 5,
            suggestion: "Replace the raw string concatenation with bound pg parameter client statements ($1)."
          },
          {
            type: "performance" as const,
            severity: "medium" as const,
            message: "Unnecessary recreation of client connections inside loop limits. Causes database socket exhaust.",
            line: 12,
            suggestion: "Instantiate connections globally or leverage node connection pooled states as imports."
          }
        ],
        summary: "This file has critical security challenges (raw SQL concatenation is vulnerable to injections) and bad resource mapping. Refactored database client pools resolve limits.",
        optimizedCode: `// Optimized Database Gateway Helper
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20
});

export async function fetchUserOrders(userId: string) {
  const query = 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC';
  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Failed to log orders query safely:', error);
    throw new Error('Database request error');
  }
}`
      };
      return res.json(simulatedReview);
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
  For instance, Alice is handling task-1 (5 pts), Charlie is blocked by task-1 on task-3 (3 pts), Bob is on task-2 (8 pts). Report these numbers clearly.
  Suggest explicit corrective actions. Keep responses friendly, elegant, and highly structured (use lists and markdown bold states as proper scannable rhythms).

  User query: "${message}"
  `;

  try {
    const isMock = !req.ai;
    if (isMock) {
      // Return beautiful contextual mock response when offline
      let answer = "";
      const lower = message.toLowerCase();
      if (lower.includes("bottleneck") || lower.includes("block")) {
        answer = `Our current main **bottleneck** is **Task-3 (Responsive order visualizer)** which is assigned to **Charlie Martinez**. 

- **The Cause**: It is explicitly blocked by **Task-1 (Scalable bulk checkout API)** currently being refactored by **Alice**.
- **Impact**: Any delays in completing Alice's lock logic hold back Charlie's frontend timeline.
- **AI Recommendation**: Charlie has spare capacity (currently carrying only 5 workload points compared to his 8-point velocity). I advise routing **Charlie to pair-program on Task-1's integration tests** with Alice today. This will secure the bulk orders setup sooner and immediately unblock Task-3!`;
      } else if (lower.includes("workload") || lower.includes("allocation") || lower.includes("developer")) {
        answer = `Here is our current **Developer Workload Allocation & Metrics**:

1. **Bob Forrester** (Backend Specialist):
   - **Workload Assigned**: 10 Story Points (Active Task: Webhook signature audits).
   - **Velocity Limit**: 10 Story Points.
   - **Status**: **Fully loaded (100% boundary)**. No extra capacity should look his path during this sprint iteration.

2. **Alice Vance** (Lead Full Stack Architect):
   - **Workload Assigned**: 8 Story Points (Active Task: Redis checking locks).
   - **Velocity Limit**: 12 Story Points.
   - **Status**: **Healthy (66% capacity)**. Alice has 4 story points of spare room to support other paths.

3. **Charlie Martinez** (Frontend Specialist):
   - **Workload Assigned**: 5 Story Points (Active Task: Billing Tracking stepper).
   - **Velocity Limit**: 8 Story Points.
   - **Status**: **Underallocated (62% capacity) but BLOCKED**. Charlie has developer cycles but cannot complete the active logic until the API is stable.

4. **Diana Sterling** (QA Automation):
   - **Workload Assigned**: 4 Story Points. 
   - **Velocity Limit**: 11 Story Points.
   - **Status**: **Underallocated (36% capacity)**. Diana has substantial spare capacity.`;
      } else {
        answer = `I am reviewing our current **SaaS Launchpad - Sprint 1** health metrics:

- **Overall Health Core**: 82% confidence of timely completion.
- **Sprint Goals**: Enable payment safeguards and Stripe webhooks, optimize check concurrency rates using Redis, and design order shipment dashboards.
- **Roster Alignment**: Alice, Bob, and Charlie are active, while Diana retains 7 points of extra velocity.
- **Actions Required**:
  1. Address the blocker on **Task-3** by pairing Charlie with Alice on Redis tests.
  2. Complete **Task-2** (cryptographic webhook audits) to allow Diana to launch automated end-to-end integration test suites.

How can I assist you further with task tracking, code review templates, or timeline adjustments?`;
      }

      return res.json({ text: answer });
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

  Analyse the workload points relative to their velocity limits. Identify who is under pressure (e.g. Bob Forrester is 100% loaded at 10/10 SP with critical Stripe webhook audits; Alice Vance is 8/12 SP; Charlie Martinez is blocked on code checkouts and expressed friction). Identify who is blocked, stressed, or underutilized.
  
  Generate a comprehensive Morale & Burnout Report. Output exactly as a JSON schema of the format:
  {
    "teamSentimentScore": 78, // Overall team health index out of 100
    "teamSentimentStatus": "Focused but Constrained", // 2-4 word high level state
    "developerMorale": [
      {
        "id": "dev-1", // Must match a developer's ID
        "name": "Alice Vance",
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
    const isMock = !req.ai;
    if (isMock) {
      // High quality situational mock data matching current DB state exactly
      const simulatedMorale = {
        teamSentimentScore: 74,
        teamSentimentStatus: "Constrained on Critical Path",
        developerMorale: [
          {
            id: "dev-1",
            name: "Alice Vance",
            burnoutScore: 50,
            status: "Moderate Risk",
            mood: "Focused",
            narrative: "Alice is currently managing the bulk order checkout implementation (Task-1). While she has some capacity remaining (8/12 SP), she is carrying the weight of unblocking Charlie's frontend progress."
          },
          {
            id: "dev-2",
            name: "Bob Forrester",
            burnoutScore: 82,
            status: "High Burnout Risk",
            mood: "Overloaded",
            narrative: "Bob is 100% fully allocated (10/10 SP) on critical security audits for Stripe checkout webhooks. Standups show high complexity. He requires immediate reviews of incoming PRs to alleviate pressure."
          },
          {
            id: "dev-3",
            name: "Charlie Martinez",
            burnoutScore: 65,
            status: "Moderate Risk",
            mood: "Blocked",
            narrative: "Charlie is underallocated at 5/8 SP but is currently completely blocked from completing Task-3 until Alice delivers the API locks. The resulting workflow delay is causing developmental friction."
          },
          {
            id: "dev-4",
            name: "Diana Sterling",
            burnoutScore: 30,
            status: "Low Risk",
            mood: "Calm",
            narrative: "Diana has substantial spare headroom (4/11 SP assigned) and is focused on security audits and automated QA test suites. She represents premium unutilized buffering capacity."
          }
        ],
        recommendations: [
          "Urgent load shedding: Shift secondary verification duties from Bob to Diana Sterling to prevent Bob's burnout.",
          "Blocker resolution: Enable Charlie Martinez to pair-program with Alice Vance on Task-1 to accelerate API stability and unblock Task-3.",
          "Capacity matching: Distribute new requirements to Diana Sterling who holds high-velocity buffer Room."
        ]
      };
      return res.json(simulatedMorale);
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
