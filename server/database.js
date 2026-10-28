import mongoose from "mongoose";

let connectionPromise;

// Concurrent requests in one function instance share a single connection attempt.
export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 60000,
      bufferCommands: false,
    });
  }
  try {
    return await connectionPromise;
  } finally {
    // A failed attempt can be retried; an established connection is reused above.
    connectionPromise = undefined;
  }
}
