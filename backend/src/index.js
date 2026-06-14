// Load env vars FIRST — before any other import that might read process.env
import "dotenv/config";

import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json());

// ── /api router ──────────────────────────────────────────────────────────────
const api = express.Router();

// Health check
api.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ── Auth routes (no auth required) ───────────────────────────────────────────
import authRouter from "./routes/auth.js";
api.use("/auth", authRouter);

// ── User key management (requireAuth is applied inside keysRouter) ────────────
import keysRouter from "./routes/keys.js";
api.use("/user/keys", keysRouter);

// ── Auth middleware ───────────────────────────────────────────────────────────
import { requireAuth } from "./middleware/auth.js";

// ── Route mounts (protected) ──────────────────────────────────────────────────
// P1 (mounted):
import questionsRouter from "./routes/questions.js";
api.use("/question", requireAuth, questionsRouter);
// P2 (mounted):
import evaluateRouter from "./routes/evaluate.js";
api.use("/evaluate", requireAuth, evaluateRouter);
// P3 (mounted):
import ttsRouter from "./routes/tts.js";
api.use("/tts", requireAuth, ttsRouter);
// ─────────────────────────────────────────────────────────────────────────────

app.use("/api", api);

// ── Serve React frontend static files (production) ────────────────────────────
const distPath = join(__dirname, "../../frontend/dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — any non-API route returns index.html
  app.get("*", (_req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}

// 4-arg error middleware (Express 4 — the 4 params make Express recognize it)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  // INV1: never leak raw error messages that might contain API keys
  const message =
    status < 500
      ? err.message || "Bad request"
      : "Internal server error";
  res.status(status).json({ error: message });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
