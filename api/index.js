import { createApp } from "../server/app.js";
import { connectDatabase } from "../server/database.js";

const app = createApp();

// Vercel owns the HTTP listener. Only the local entry point starts app.listen().
export default async function handler(req, res) {
  try {
    await connectDatabase();
  } catch {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify({
        error:
          "Database connection unavailable. Check MONGODB_URI and Atlas network access.",
        database: "disconnected",
      }),
    );
    return;
  }
  return app(req, res);
}
