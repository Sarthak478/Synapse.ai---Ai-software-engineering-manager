import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 10;

const developerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  workspaceId: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String },
  email: { type: String, required: true },
  role: { type: String },
  skills: { type: [String], default: [] },
  workloadPoints: { type: Number, default: 0 },
  velocity: { type: Number, default: 10 },
  activeTaskId: { type: String },
  isHead: { type: Boolean, default: false },
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordHistory: { type: [String], default: [] },
  passwordChangedAt: { type: Date, default: null },
  mustResetPassword: { type: Boolean, default: true },
  addedBy: { type: String },
  personalCredentials: { type: Object, default: {} },
  personalCredentialsEncrypted: { type: String, default: "" },
  contributions: {
    commits: { type: Number, default: 0 },
    PRs: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 }
  },
  // SECURITY FIX #11: Account lockout after failed attempts
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  // SECURITY FIX #12: Token Revocation support via versioning
  sessionVersion: { type: Number, default: 1 }
});

// We keep the logic in stateManager to avoid double hashing, 
// but we could also do a pre-save hook here if needed.
// For now, stateManager handles hashing explicitly just like before.

export const Developer = mongoose.model("Developer", developerSchema);

const settingsSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true, unique: true },
  geminiApiKeyHash: { type: String, default: "" },
  geminiApiKeyEncrypted: { type: String, default: "" },
  masterRecoveryKeyHash: { type: String, default: "" },
  repositories: { type: Array, default: [] },
  notifications: { type: Array, default: [] },
  recoveryPasscodes: { type: Array, default: [] },
  // SECURITY FIX #15: Security audit trail
  auditLogs: { type: Array, default: [] },
  // Hybrid Email System: Resend integration
  resendApiKeyEncrypted: { type: String, default: "" },
  resendFromEmail: { type: String, default: "" }
});

export const Settings = mongoose.model("Settings", settingsSchema);
