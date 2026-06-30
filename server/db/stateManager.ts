import bcrypt from "bcryptjs";
import { Developer, Settings } from "./models.js";
import { connectDB } from "./connection.js";

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

// Strict allowlist of developer fields that may be stored to disk/DB
const DEV_DISK_FIELDS = [
  "id", "name", "avatar", "email", "role", "skills",
  "workloadPoints", "velocity", "activeTaskId", "isHead",
  "userId", "password", "personalCredentials", "contributions"
] as const;

/** Strips any unknown fields from a developer object before writing to DB */
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
  developers: [] as any[],
  settings: {
    geminiApiKeyHash: ""
  }
};

export async function getState() {
  await connectDB();
  
  try {
    const devs = await Developer.find({}).lean();
    let settingsDoc = await Settings.findOne({ id: "global-settings" }).lean();
    
    // Initial setup: create settings document if it doesn't exist yet
    if (!settingsDoc) {
      console.log("Initializing fresh workspace (no developers yet)...");
      settingsDoc = await Settings.create({ id: "global-settings", geminiApiKeyHash: "" });
    }

    // If no developers exist yet, return empty state (first user will register via /register)
    if (devs.length === 0) {
      return {
        developers: [],
        settings: { geminiApiKeyHash: settingsDoc.geminiApiKeyHash }
      };
    }
    
    // Safety check and migration
    let updated = false;
    const parsedDevs = await Promise.all(devs.map(async (d: any) => {
      let docUpdated = false;
      if (!d.userId) {
        d.userId = d.name.toLowerCase().replace(/\s+/g, "");
        docUpdated = true;
      }
      if (!d.password) {
        d.password = hashPasswordSync("changeme");
        docUpdated = true;
      }
      // SECURITY FIX #1: Auto-migrate any un-hashed plain-text password to bcrypt
      if (!isBcryptHash(d.password)) {
        console.log(`[Security] Migrating plain-text password for developer: ${d.userId}`);
        d.password = hashPasswordSync(d.password);
        docUpdated = true;
      }
      if (!d.personalCredentials) {
        d.personalCredentials = {};
        docUpdated = true;
      }
      if (docUpdated) {
        await Developer.updateOne({ id: d.id }, { $set: d });
      }
      return d;
    }));

    if (!settingsDoc) {
      settingsDoc = await Settings.create({ id: "global-settings", geminiApiKeyHash: "" });
    }

    return {
      developers: parsedDevs,
      settings: { geminiApiKeyHash: settingsDoc.geminiApiKeyHash }
    };
    
  } catch (error) {
    console.error("Error reading database", error);
    return {
      developers: defaultState.developers,
      settings: defaultState.settings
    };
  }
}

export async function saveState(state: any) {
  await connectDB();
  
  try {
    if (Array.isArray(state.developers)) {
      for (const d of state.developers) {
        const safeDev = sanitizeDevForDisk(d);
        await Developer.updateOne(
          { id: safeDev.id },
          { $set: safeDev },
          { upsert: true }
        );
      }
      
      // Remove devs that are not in the state
      const incomingIds = state.developers.map((d: any) => d.id);
      await Developer.deleteMany({ id: { $nin: incomingIds } });
    }

    if (state.settings) {
      await Settings.updateOne(
        { id: "global-settings" },
        { $set: { geminiApiKeyHash: state.settings.geminiApiKeyHash || "" } },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error("Error writing database", error);
  }
}
