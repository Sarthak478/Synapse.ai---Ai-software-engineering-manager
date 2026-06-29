import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DB_FILE = path.join(process.cwd(), "db.json");
const BCRYPT_SALT_ROUNDS = 10;

/** Returns true if the string is already a bcrypt hash */
function isBcryptHash(val: string): boolean {
  return typeof val === "string" && val.startsWith("$2");
}

/** Hash a plain-text password synchronously (only call during startup/migration, not in request handlers) */
export function hashPasswordSync(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_SALT_ROUNDS);
}

/** Verify a plain-text password against a bcrypt hash */
export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

// Strict allowlist of developer fields that may be stored to disk
const DEV_DISK_FIELDS = [
  "id", "name", "avatar", "email", "role", "skills",
  "workloadPoints", "velocity", "activeTaskId", "isHead",
  "userId", "password", "personalCredentials", "contributions"
] as const;

/** Strips any unknown fields from a developer object before writing to disk */
function sanitizeDevForDisk(d: any): any {
  const safe: any = {};
  for (const key of DEV_DISK_FIELDS) {
    if (key in d) safe[key] = d[key];
  }
  // personalCredentials are zero-knowledge – always blank on disk
  safe.personalCredentials = {};
  return safe;
}

export const defaultState = {
  developers: [
    {
      id: "dev-1",
      name: "Alice Vance",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      email: "alice@company.com",
      role: "Lead Full Stack Architect",
      skills: ["React", "Express", "Node.js", "System Architecture", "PostgreSQL", "AWS"],
      workloadPoints: 8,
      velocity: 12,
      activeTaskId: "task-1",
      isHead: true,
      userId: "alice",
      // ⚠️ TESTING PHASE: Plain-text password — will be replaced with secure onboarding flow before production
      password: "password123",
      personalCredentials: {},
      contributions: { commits: 45, PRs: 12, reviews: 28 }
    },
    {
      id: "dev-2",
      name: "Bob Forrester",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      email: "bob@company.com",
      role: "Backend Specialist",
      skills: ["Node.js", "Python", "Docker", "PostgreSQL", "Redis", "APIs"],
      workloadPoints: 10,
      velocity: 10,
      activeTaskId: "task-2",
      userId: "bob",
      // ⚠️ TESTING PHASE: Plain-text password — will be replaced with secure onboarding flow before production
      password: "password123",
      personalCredentials: {},
      contributions: { commits: 62, PRs: 18, reviews: 14 }
    },
    {
      id: "dev-3",
      name: "Charlie Martinez",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      email: "charlie@company.com",
      role: "Frontend Engineer",
      skills: ["React", "Tailwind CSS", "TypeScript", "UI/UX", "animations"],
      workloadPoints: 5,
      velocity: 8,
      activeTaskId: "task-3",
      userId: "charlie",
      // ⚠️ TESTING PHASE: Plain-text password — will be replaced with secure onboarding flow before production
      password: "password123",
      personalCredentials: {},
      contributions: { commits: 38, PRs: 15, reviews: 9 }
    },
    {
      id: "dev-4",
      name: "Diana Sterling",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      email: "diana@company.com",
      role: "QA & Security Auditor",
      skills: ["Jest", "Python", "Security audits", "CI/CD", "Automation", "Docker"],
      workloadPoints: 4,
      velocity: 11,
      userId: "diana",
      // ⚠️ TESTING PHASE: Plain-text password — will be replaced with secure onboarding flow before production
      password: "password123",
      personalCredentials: {},
      contributions: { commits: 14, PRs: 4, reviews: 42 }
    }
  ],
  settings: {
    geminiApiKeyHash: ""
  }
};

export function getState() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      let updated = false;

      if (!parsed.settings) {
        parsed.settings = { geminiApiKeyHash: "" };
        updated = true;
      }

      if (parsed && Array.isArray(parsed.developers)) {
        parsed.developers = parsed.developers.map((d: any) => {
          if (!d.userId) {
            d.userId = d.name.toLowerCase().replace(/\s+/g, "");
            updated = true;
          }
          if (!d.password) {
            d.password = hashPasswordSync("password123");
            updated = true;
          }
          // SECURITY FIX #1: Auto-migrate any un-hashed plain-text password to bcrypt
          if (!isBcryptHash(d.password)) {
            console.log(`[Security] Migrating plain-text password for developer: ${d.userId}`);
            d.password = hashPasswordSync(d.password);
            updated = true;
          }
          if (!d.personalCredentials) {
            d.personalCredentials = {};
            updated = true;
          }
          return d;
        });
      }

      // Ensure we DO NOT store/return any project components
      delete parsed.repositories;
      delete parsed.tasks;
      delete parsed.codeReviews;
      delete parsed.standups;
      delete parsed.chats;
      delete parsed.sprints;

      if (updated) {
        saveState(parsed);
      }
      return parsed;
    }
  } catch (error) {
    console.error("Error reading database db.json", error);
  }

  // Fallback to default
  const fallback = {
    developers: defaultState.developers,
    settings: defaultState.settings
  };
  return fallback;
}

export function saveState(state: any) {
  try {
    // SECURITY FIX #5: Strict field whitelist — only known-safe fields survive to disk
    const sanitizedToSave = {
      developers: Array.isArray(state.developers)
        ? state.developers.map(sanitizeDevForDisk)
        : [],
      settings: {
        geminiApiKeyHash: state.settings?.geminiApiKeyHash || ""
      }
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(sanitizedToSave, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database db.json", error);
  }
}

// Initial seed if file doesn't exist — hash all default passwords before writing
if (!fs.existsSync(DB_FILE)) {
  const seededState = {
    ...defaultState,
    developers: defaultState.developers.map((d) => ({
      ...d,
      password: hashPasswordSync(d.password)
    }))
  };
  saveState(seededState);
}
