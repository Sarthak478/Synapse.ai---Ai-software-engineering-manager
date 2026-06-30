import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("No MongoDB URI found in .env");
  process.exit(1);
}

const developerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
});
const Developer = mongoose.model("Developer", developerSchema);

const settingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
});
const Settings = mongoose.model("Settings", settingsSchema);

async function wipeDatabase() {
  try {
    await mongoose.connect(uri!);
    console.log("Connected to DB...");
    
    await Developer.deleteMany({});
    console.log("Deleted all developers.");
    
    await Settings.deleteMany({});
    console.log("Deleted all settings.");
    
    console.log("Database completely wiped. Ready for fresh setup.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to wipe database:", err);
    process.exit(1);
  }
}

wipeDatabase();
