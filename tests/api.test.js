import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createApp } from "../server/app.js";
test("API health and explicit unavailable database errors", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.on("listening", resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/api/health`).then((r) => r.json());
    assert.equal(health.database, "disconnected");
    const response = await fetch(`${base}/api/invoices`);
    assert.equal(response.status, 503);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
