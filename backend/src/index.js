// Load env vars FIRST — before any other import that might read process.env
import "dotenv/config";

import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// ── /api router ──────────────────────────────────────────────────────────────
const api = express.Router();

// Health check
api.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ── WIRE POINT: future route mounts go here ──────────────────────────────────
// P1: import questionsRouter from "./routes/questions.js";
//     api.use("/question", questionsRouter);
// P2: import evaluateRouter from "./routes/evaluate.js";
//     api.use("/evaluate", evaluateRouter);
// P3: import ttsRouter from "./routes/tts.js";
//     api.use("/tts", ttsRouter);
// ─────────────────────────────────────────────────────────────────────────────

app.use("/api", api);

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
