import { test, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { connectDatabase } from "../server/database.js";

test("serverless connection shares in-flight attempts and retries a failure", async () => {
  const previous = process.env.MONGODB_URI;
  process.env.MONGODB_URI = "mongodb://example.invalid/test";
  let release;
  const first = new Promise((resolve) => {
    release = resolve;
  });
  const connect = mock.method(mongoose, "connect", () => first);
  try {
    const one = connectDatabase();
    const two = connectDatabase();
    assert.equal(connect.mock.callCount(), 1);
    release(mongoose);
    await Promise.all([one, two]);
    connect.mock.mockImplementation(() => Promise.reject(new Error("offline")));
    await assert.rejects(connectDatabase(), /offline/);
    connect.mock.mockImplementation(() => Promise.resolve(mongoose));
    await connectDatabase();
    assert.equal(connect.mock.callCount(), 3);
  } finally {
    connect.mock.restore();
    if (previous === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previous;
  }
});
