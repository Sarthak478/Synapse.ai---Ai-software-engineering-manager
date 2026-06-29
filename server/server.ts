import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Import Custom Middlewares
import { securityMiddleware, errorBoundary } from "./middlewares/security.js";
import { authenticateToken } from "./middlewares/auth.js";

// Import Modular Routers
import authRouter from "./routes/auth.js";
import stateRouter from "./routes/state.js";
import jiraRouter from "./routes/jira.js";
import geminiRouter from "./routes/gemini.js";

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Core Request Parsers
app.use(express.json({ limit: "20mb" }));

// 2. Security Filtering & Custom headers
app.use(securityMiddleware);

// 3. API Route Registration
// Public Authentication endpoints
app.use("/api/auth", authRouter);

// Token-Protected API Routes
app.use("/api/state", authenticateToken, stateRouter);
app.use("/api/jira", authenticateToken, jiraRouter);
app.use("/api/gemini", authenticateToken, geminiRouter);

// Standard healthcheck endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 4. Global Server Error Boundary
app.use(errorBoundary);

// 5. Setup Vite Dev Middleware or Serve Production Static Bundle
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: path.join(process.cwd(), "client"),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "client", "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

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
