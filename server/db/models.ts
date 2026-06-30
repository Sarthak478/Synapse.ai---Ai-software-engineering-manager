import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 10;

const developerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: { type: String },
  email: { type: String },
  role: { type: String },
  skills: { type: [String], default: [] },
  workloadPoints: { type: Number, default: 0 },
  velocity: { type: Number, default: 10 },
  activeTaskId: { type: String },
  isHead: { type: Boolean, default: false },
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  personalCredentials: { type: Object, default: {} },
  contributions: {
    commits: { type: Number, default: 0 },
    PRs: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 }
  }
});

// We keep the logic in stateManager to avoid double hashing, 
// but we could also do a pre-save hook here if needed.
// For now, stateManager handles hashing explicitly just like before.

export const Developer = mongoose.model("Developer", developerSchema);

const settingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: "global-settings" },
  geminiApiKeyHash: { type: String, default: "" }
});

export const Settings = mongoose.model("Settings", settingsSchema);
