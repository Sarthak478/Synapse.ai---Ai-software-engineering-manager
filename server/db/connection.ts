import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
      console.log("MongoDB connected successfully.");
    }
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}
