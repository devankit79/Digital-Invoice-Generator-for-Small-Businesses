import mongoose from "mongoose";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { createApp } from "./app.js";
let memory;
const app = createApp();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
app.use(express.static(path.join(root, "client/dist")));
app.get("/{*path}", (_req, res) =>
  res.sendFile(path.join(root, "client/dist/index.html")),
);
const server = app.listen(process.env.PORT || 4000, "127.0.0.1", () =>
  console.log(`API available at http://127.0.0.1:${process.env.PORT || 4000}`),
);
try {
  let uri =
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/digital_invoice_generator";
  if (
    process.env.LOCAL_MONGODB === "true" ||
    process.env.USE_MEMORY_DB === "true"
  ) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const persistent = process.env.LOCAL_MONGODB === "true";
    const dbPath = path.join(root, ".data", "mongodb");
    if (persistent) await mkdir(dbPath, { recursive: true });
    memory = await MongoMemoryServer.create({
      instance: {
        ...(persistent ? { dbPath } : {}),
        storageEngine: "wiredTiger",
        ip: "127.0.0.1",
      },
    });
    uri = memory.getUri("digital_invoice_generator");
    console.log(
      persistent
        ? "Local MongoDB started. Records are stored in .data/mongodb."
        : "Temporary demo MongoDB: records are removed when the server stops.",
    );
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("MongoDB connected");
} catch (error) {
  console.error(
    `MongoDB unavailable: ${error.message}. Preview and PDF still work; saving requires MongoDB.`,
  );
}
async function stop() {
  server.close();
  await mongoose.disconnect();
  if (memory)
    await memory.stop({ doCleanup: process.env.LOCAL_MONGODB !== "true" });
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
