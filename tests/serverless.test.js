import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import handler from "../api/index.js";

test("serverless entry returns a safe JSON error without database configuration", async () => {
  const previous = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  const server = createServer(handler).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.on("listening", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/health`,
    );
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.database, "disconnected");
    assert.ok(!JSON.stringify(body).includes("mongodb+srv://"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous !== undefined) process.env.MONGODB_URI = previous;
  }
});
