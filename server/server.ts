import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Import Custom Middlewares
import { securityMiddleware, errorBoundary, authRateLimit, aiRateLimit, csrfProtection } from "./middlewares/security.js";
import { authenticateToken } from "./middlewares/auth.js";
import { connectDB } from "./db/connection.js";

// Import Modular Routers
import authRouter from "./routes/auth.js";
import stateRouter from "./routes/state.js";
import jiraRouter from "./routes/jira.js";
import geminiRouter from "./routes/gemini.js";
import { buildCorsOptions, parsePort } from "./config.js";

dotenv.config();

const app = express();
const PORT = parsePort(process.env.PORT, 3001);

// Prevent server fingerprinting via X-Powered-By header
app.disable("x-powered-by");

// 1. Core Request Parsers
// SECURITY FIX #6: Strict global body size limit to prevent memory exhaustion DoS
app.use(express.json({ limit: "100kb" }));

// Enable CORS for frontend integration with production allowlisting.
app.use(cors(buildCorsOptions(process.env)));

// 2. Security Filtering & Custom headers
app.use(securityMiddleware);

// 3. API Route Registration
// Public Authentication endpoints
app.use("/api/auth", authRateLimit, authRouter);

// Token-Protected API Routes
// SECURITY FIX #6: Only allow larger payloads on specific routes that genuinely need it
app.use("/api/state", authenticateToken, csrfProtection, express.json({ limit: "5mb" }), stateRouter);
app.use("/api/jira", authenticateToken, csrfProtection, jiraRouter);
app.use("/api/gemini", authenticateToken, csrfProtection, aiRateLimit, geminiRouter);

// Standard healthcheck endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 4. Global Server Error Boundary
app.use(errorBoundary);

// 5. Start Backend Server
async function startServer() {
  await connectDB();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(` SYNAPSE ENTERPRISE GATEWAY BOOTED SUCCESSFULLY     `);
    console.log(` Mode: ${process.env.NODE_ENV || "development"}     `);
    console.log(` Ingress: http://localhost:${PORT}                  `);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error("FATAL: Failed to initialize Gateway Orchestration:", err);
  process.exit(1);
});
