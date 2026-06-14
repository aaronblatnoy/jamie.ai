// anthropic.js — Lazy Anthropic client singleton + answer evaluation
// INV1: ANTHROPIC_API_KEY is read lazily inside getClient(); never at module top level.
// INV6: claude-opus-4-8, thinking:{type:"adaptive"}, output_config.format (not top-level
//        output_format), NO assistant prefill.
import Anthropic from "@anthropic-ai/sdk";

// ── Lazy singleton ────────────────────────────────────────────────────────────
let _client = null;

function getClient() {
  if (!_client) {
    // Read env lazily — dotenv is loaded first in index.js; safe to read here.
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const err = new Error("ANTHROPIC_API_KEY is not set");
      err.code = "MISSING_API_KEY";
      throw err;
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ── Eval schema ───────────────────────────────────────────────────────────────
// Structured-output schema for the Claude response.
// output_config.format enforces shape; we also validate + clamp server-side.
const EVAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    hit: {
      type: "array",
      items: { type: "string" },
    },
    missed: {
      type: "array",
      items: { type: "string" },
    },
    feedback_line: { type: "string" },
    score: { type: "integer" },
  },
  required: ["hit", "missed", "feedback_line", "score"],
};

// ── evaluateAnswer ────────────────────────────────────────────────────────────
/**
 * Call Claude to score a candidate's answer against the question's key_points.
 *
 * @param {object} params
 * @param {string} params.system      Mode-specific system prompt text.
 * @param {string} params.question    The interview question.
 * @param {string[]} params.key_points The scoring rubric.
 * @param {string} params.user_answer The transcribed candidate answer.
 * @returns {Promise<{hit:string[], missed:string[], feedback_line:string, score:number}>}
 * @throws {EvalParseError} on JSON parse / shape validation failure (-> 502).
 */
export async function evaluateAnswer({ system, question, key_points, user_answer }) {
  const client = getClient(); // INV1: key read lazily here, not at import time

  // Build a clearly labeled user message so Claude can identify each field.
  const keyPointsBullets = Array.isArray(key_points)
    ? key_points.map((kp) => `- ${kp}`).join("\n")
    : String(key_points);

  const userContent =
    `Question:\n${question}\n\n` +
    `Key points (rubric):\n${keyPointsBullets}\n\n` +
    `Candidate answer:\n${user_answer}`;

  // INV6: model claude-opus-4-8, thinking:{type:"adaptive"},
  //        output_config.format (NOT top-level output_format).
  //        NO assistant prefill message (would 400 on this model).
  let response;
  try {
    response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system,
      // output_config is a pass-through field for the API;
      // not yet in SDK types at 0.52 but accepted by the wire protocol.
      // @ts-ignore
      output_config: {
        format: {
          type: "json_schema",
          schema: EVAL_SCHEMA,
        },
      },
      messages: [
        { role: "user", content: userContent },
        // NO assistant prefill — would 400 on claude-opus-4-8 (INV6/A7)
      ],
    });
  } catch (err) {
    // Wrap SDK/network errors as EvalUpstreamError so the route maps them to 502.
    const wrapped = new EvalUpstreamError(
      `Claude API call failed: ${err.message ?? "unknown"}`
    );
    wrapped.cause = err;
    throw wrapped;
  }

  // Parse the structured JSON from the first text block in the response.
  // With output_config.format the model returns a text block containing the JSON.
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new EvalParseError("No text block in Claude response");
  }

  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (jsonErr) {
    throw new EvalParseError(`JSON.parse failed: ${jsonErr.message}`);
  }

  // Validate shape (output_config enforces it, but be defensive server-side).
  if (
    !Array.isArray(parsed.hit) ||
    !Array.isArray(parsed.missed) ||
    typeof parsed.feedback_line !== "string" ||
    typeof parsed.score !== "number"
  ) {
    throw new EvalParseError(
      "Claude response missing required fields: hit, missed, feedback_line, score"
    );
  }

  // Coerce hit/missed to arrays of strings (should already be, but guard).
  const hit = parsed.hit.map(String);
  const missed = parsed.missed.map(String);
  const feedback_line = parsed.feedback_line;

  // Clamp score to [0, 100] (INV6: schema can't enforce numeric range in 0.52).
  const score = Math.max(0, Math.min(100, Math.round(parsed.score)));

  return { hit, missed, feedback_line, score };
}

// ── Typed errors ──────────────────────────────────────────────────────────────
// These let the route distinguish parse failures from upstream call failures
// while keeping both opaque to the client (both become generic 502).

export class EvalParseError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "EvalParseError";
    this.code = "EVAL_PARSE_ERROR";
  }
}

export class EvalUpstreamError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "EvalUpstreamError";
    this.code = "EVAL_UPSTREAM_ERROR";
  }
}
