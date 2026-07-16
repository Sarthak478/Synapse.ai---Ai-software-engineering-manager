import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Developer, Settings } from "./models.js";
import { connectDB } from "./connection.js";

const BCRYPT_SALT_ROUNDS = 10;
const ALGORITHM = "aes-256-gcm";

export interface SettingsState {
  geminiApiKeyHash: string;
  geminiApiKeyEncrypted?: string;
  masterRecoveryKeyHash?: string;
  notifications: any[];
  recoveryPasscodes: any[];
}

export interface DatabaseState {
  developers: any[];
  repositories: any[];
  settings: SettingsState;
}

export function resolveEncryptionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const explicitSecret = env.DATA_ENCRYPTION_SECRET || env.JWT_SECRET;
  if (explicitSecret && explicitSecret.length >= 32) {
    return explicitSecret;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("DATA_ENCRYPTION_SECRET or JWT_SECRET must be set to at least 32 characters in production.");
  }

  return String(env.MONGODB_URI || "fallback-dev-secret-key");
}

const SECRET_KEY = crypto.createHash("sha256").update(resolveEncryptionSecret()).digest("base64").substring(0, 32);

// Startup diagnostic: log which encryption secret source is active
(() => {
  const env = process.env;
  const source = (env.DATA_ENCRYPTION_SECRET && env.DATA_ENCRYPTION_SECRET.length >= 32)
    ? "DATA_ENCRYPTION_SECRET"
    : (env.JWT_SECRET && env.JWT_SECRET.length >= 32)
      ? "JWT_SECRET"
      : env.NODE_ENV === "production"
        ? "ERROR (none set!)"
        : "MONGODB_URI fallback (dev only)";
  console.log(`[Encryption] Secret source: ${source}`);
})();

export function encryptKey(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptKey(encryptedData: string): string {
  if (!encryptedData) return "";
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 3) return encryptedData; // Unencrypted fallback for legacy data
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error("Decryption failed", err);
    return "";
  }
}

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
  "id", "workspaceId", "name", "avatar", "email", "role", "skills",
  "workloadPoints", "velocity", "activeTaskId", "isHead",
  "userId", "password", "passwordHistory", "passwordChangedAt", "addedBy", "personalCredentials", "contributions"
] as const;

/** Strips any unknown fields from a developer object before writing to DB */
function sanitizeDevForDisk(d: any): any {
  const safe: any = {};
  for (const key of DEV_DISK_FIELDS) {
    if (key in d) safe[key] = d[key];
  }
  
  // SECURITY FIX: Encrypt personal credentials at rest
  if (d.personalCredentials && Object.keys(d.personalCredentials).length > 0) {
    try {
      safe.personalCredentialsEncrypted = encryptKey(JSON.stringify(d.personalCredentials));
    } catch (e) {
      console.error("[StateManager] Failed to encrypt personal credentials");
    }
  }
  
  // Wipe the plain-text credentials so they are never written to DB directly
  safe.personalCredentials = {};
  return safe;
}

export const defaultState: DatabaseState = {
  developers: [] as any[],
  repositories: [] as any[],
  settings: {
    geminiApiKeyHash: "",
    geminiApiKeyEncrypted: "",
    masterRecoveryKeyHash: "",
    notifications: [],
    recoveryPasscodes: []
  }
};

export async function getState(workspaceId: string = "default-workspace") {
  await connectDB();
  const cleanWorkspaceId = workspaceId.trim().toLowerCase();
  
  try {
    const devs = await Developer.find({ workspaceId: cleanWorkspaceId }).lean();
    let settingsDoc = await Settings.findOne({ workspaceId: cleanWorkspaceId }).lean();
    
    // Initial setup: create settings document if it doesn't exist yet for this workspace
    if (!settingsDoc) {
      console.log(`Initializing fresh settings for workspace: ${cleanWorkspaceId}...`);
      settingsDoc = await Settings.create({ workspaceId: cleanWorkspaceId, geminiApiKeyHash: "" });
    }

    // If no developers exist yet, return empty state
    if (devs.length === 0) {
      return {
        developers: [],
        repositories: settingsDoc.repositories || [],
        settings: { 
          geminiApiKeyHash: settingsDoc.geminiApiKeyHash,
          geminiApiKeyEncrypted: settingsDoc.geminiApiKeyEncrypted || "",
          masterRecoveryKeyHash: settingsDoc.masterRecoveryKeyHash || "",
          notifications: settingsDoc.notifications || [],
          recoveryPasscodes: settingsDoc.recoveryPasscodes || []
        }
      };
    }
    
    // Safety check and migration
    const parsedDevs = await Promise.all(devs.map(async (d: any) => {
      let docUpdated = false;
      if (!d.userId) {
        d.userId = d.name.toLowerCase().replace(/\s+/g, "");
        docUpdated = true;
      }
      if (!d.password) {
        d.password = hashPasswordSync(crypto.randomBytes(24).toString("base64url"));
        docUpdated = true;
      }
      // SECURITY FIX #1: Auto-migrate any un-hashed plain-text password to bcrypt
      if (!isBcryptHash(d.password)) {
        console.log(`[Security] Migrating plain-text password for developer: ${d.userId}`);
        d.password = hashPasswordSync(d.password);
        docUpdated = true;
      }
      if (d.personalCredentialsEncrypted) {
        try {
          d.personalCredentials = JSON.parse(decryptKey(d.personalCredentialsEncrypted));
        } catch (e) {
          console.error(`[StateManager] Failed to decrypt personal credentials for ${d.userId}`);
          d.personalCredentials = {};
        }
      } else if (!d.personalCredentials) {
        d.personalCredentials = {};
        docUpdated = true;
      }
      if (docUpdated) {
        await Developer.updateOne({ id: d.id, workspaceId: cleanWorkspaceId }, { $set: d });
      }
      return d;
    }));

    return {
      developers: parsedDevs,
      repositories: settingsDoc.repositories || [],
      settings: { 
        geminiApiKeyHash: settingsDoc.geminiApiKeyHash,
        geminiApiKeyEncrypted: settingsDoc.geminiApiKeyEncrypted || "",
        masterRecoveryKeyHash: settingsDoc.masterRecoveryKeyHash || "",
        notifications: settingsDoc.notifications || [],
        recoveryPasscodes: settingsDoc.recoveryPasscodes || []
      }
    };
    
  } catch (error) {
    console.error("Error reading database", error);
    return {
      developers: defaultState.developers,
      repositories: defaultState.repositories,
      settings: defaultState.settings
    };
  }
}

export async function saveState(state: any, workspaceId: string = "default-workspace") {
  await connectDB();
  const cleanWorkspaceId = workspaceId.trim().toLowerCase();
  
  try {
    if (Array.isArray(state.developers)) {
      for (const d of state.developers) {
        const safeDev = sanitizeDevForDisk(d);
        // Force the workspaceId on all saved devs to maintain separation
        safeDev.workspaceId = cleanWorkspaceId;
        await Developer.updateOne(
          { id: safeDev.id, workspaceId: cleanWorkspaceId },
          { $set: safeDev },
          { upsert: true }
        );
      }
      
      // Remove devs that are not in the state but belong to this workspace
      const incomingIds = state.developers.map((d: any) => d.id);
      await Developer.deleteMany({ id: { $nin: incomingIds }, workspaceId: cleanWorkspaceId });
    }

    if (state.settings) {
      await Settings.updateOne(
        { workspaceId: cleanWorkspaceId },
        { $set: { 
          geminiApiKeyHash: state.settings.geminiApiKeyHash || "",
          geminiApiKeyEncrypted: state.settings.geminiApiKeyEncrypted || "",
          masterRecoveryKeyHash: state.settings.masterRecoveryKeyHash || "",
          repositories: Array.isArray(state.repositories) ? state.repositories : [],
          notifications: state.settings.notifications || [],
          recoveryPasscodes: state.settings.recoveryPasscodes || []
        } },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error("Error writing database", error);
  }
}
