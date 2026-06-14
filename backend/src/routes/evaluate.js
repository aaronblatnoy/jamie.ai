// evaluate.js — POST /api/evaluate
// INV1: upstream errors are mapped to a generic 502; no key or raw SDK error leaks.
// INV2: stateless — body contains everything needed (question, key_points, user_answer, mode).
// INV6: evaluateAnswer handles model config; this route only validates input + calls it.
import { Router } from "express";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluateAnswer, EvalParseError, EvalUpstreamError } from "../lib/anthropic.js";

const router = Router();

// Resolve prompts directory relative to this file (ESM-safe, no CJS __dirname):
// backend/src/routes/evaluate.js -> backend/src/prompts/
const thisFile = fileURLToPath(import.meta.url);
const thisDir = dirname(thisFile);
const PROMPTS_DIR = join(thisDir, "..", "prompts");

// Valid modes (INV4: we never use the raw mode string as a directory path here;
// evaluate only uses it to select the system prompt file).
const VALID_MODES = new Set(["ib", "rx"]);

// Cache loaded system-prompt strings to avoid repeated disk reads.
const promptCache = new Map();

async function loadSystemPrompt(mode) {
  if (promptCache.has(mode)) return promptCache.get(mode);
  const text = await readFile(join(PROMPTS_DIR, `${mode}-system.txt`), "utf8");
  promptCache.set(mode, text);
  return text;
}

// asyncHandler — catches async errors and forwards them to Express error middleware.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * POST /api/evaluate
 *
 * Body: { question, key_points: string[], user_answer, mode: "ib"|"rx" }
 *
 * 200: { hit: string[], missed: string[], feedback_line: string, score: number }
 * 400: missing question / user_answer / bad mode
 * 502: Claude upstream or parse failure (no key leak — INV1)
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { question, key_points, user_answer, mode } = req.body ?? {};

    if (!req.user.anthropicKey) {
      return res.status(402).json({ error: "anthropic_key_required" });
    }

    // ── Input validation — 400s ────────────────────────────────────────────────
    if (!question || typeof question !== "string" || question.trim() === "") {
      return res.status(400).json({ error: "question is required" });
    }
    if (!user_answer || typeof user_answer !== "string" || user_answer.trim() === "") {
      return res.status(400).json({ error: "user_answer is required" });
    }
    if (!mode || !VALID_MODES.has(mode)) {
      return res
        .status(400)
        .json({ error: `mode is required and must be one of: ${[...VALID_MODES].join(", ")}` });
    }

    // key_points should be an array; coerce gracefully.
    const kp = Array.isArray(key_points)
      ? key_points
      : typeof key_points === "string"
      ? key_points.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];

    // ── Load system prompt ────────────────────────────────────────────────────
    let system;
    try {
      system = await loadSystemPrompt(mode);
    } catch (err) {
      // Prompt file missing → 502 (server misconfiguration, not a client error)
      console.error(`[evaluate] Failed to load system prompt for mode=${mode}:`, err.message);
      return res.status(502).json({ error: "evaluation_failed" });
    }

    // ── Call Claude ───────────────────────────────────────────────────────────
    let result;
    try {
      result = await evaluateAnswer({ apiKey: req.user.anthropicKey, system, question, key_points: kp, user_answer });
    } catch (err) {
      // INV1: log a sanitized message — NEVER log the key, raw SDK payload, or model answer.
      if (err instanceof EvalParseError) {
        console.error("[evaluate] parse error:", err.message);
      } else if (err instanceof EvalUpstreamError) {
        console.error("[evaluate] upstream error (sanitized):", err.message.replace(/sk-ant-[^\s]*/g, "[REDACTED]"));
      } else {
        console.error("[evaluate] unexpected error:", err.message);
      }
      return res.status(502).json({ error: "evaluation_failed" });
    }

    // ── Success ───────────────────────────────────────────────────────────────
    return res.json(result);
  })
);

export default router;
