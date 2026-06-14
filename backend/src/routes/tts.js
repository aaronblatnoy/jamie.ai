import { Router } from "express";
import { Readable } from "node:stream";

const router = Router();

const ELEVENLABS_TTS_BASE =
  "https://api.elevenlabs.io/v1/text-to-speech";

// POST /api/tts
// Body: { text (required), voice_id? (override), mode? ("ib"|"rx") }
router.post("/", async (req, res) => {
  const { text, voice_id, mode } = req.body ?? {};

  // INV1: validate input — 400 if text missing
  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "text is required" });
  }

  const voiceIb = process.env.ELEVENLABS_VOICE_ID_IB;
  const voiceRx = process.env.ELEVENLABS_VOICE_ID_RX;
  const apiKey = req.user.elevenLabsKey;

  if (!apiKey) {
    return res.status(402).json({ error: "elevenlabs_key_required" });
  }

  // A4: voice selection — explicit override > mode-selected > IB default
  const voice =
    voice_id ||
    (mode === "rx" ? voiceRx : voiceIb) ||
    voiceIb;

  if (!voice) {
    // No voice configured at all — return 502 (not a 400, it's a server config issue)
    console.warn("[tts] No voice ID configured; check ELEVENLABS_VOICE_ID_IB / _RX");
    return res.status(502).json({ error: "tts_failed" });
  }

  const url = `${ELEVENLABS_TTS_BASE}/${encodeURIComponent(voice)}/stream`;

  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        // INV1: key sent to ElevenLabs only — never echoed back to client
        "xi-api-key": apiKey ?? "",
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });
  } catch (fetchErr) {
    // Network-level error — log sanitized, never include the key
    console.error("[tts] fetch error:", fetchErr.message);
    return res.status(502).json({ error: "tts_failed" });
  }

  if (!upstream.ok) {
    // INV1: log status + short snippet only; NEVER log the key or full response
    let snippet = "";
    try {
      const raw = await upstream.text();
      snippet = raw.slice(0, 120);
    } catch {
      // ignore read error
    }
    console.error(
      `[tts] upstream error: status=${upstream.status} body_snippet=${snippet}`
    );
    return res.status(502).json({ error: "tts_failed" });
  }

  // Stream the audio back to the client
  res.setHeader("Content-Type", "audio/mpeg");

  const nodeStream = Readable.fromWeb(upstream.body);

  // Backpressure / client disconnect: destroy the upstream reader when the
  // response closes so we don't keep consuming the ElevenLabs stream.
  res.on("close", () => {
    nodeStream.destroy();
  });

  nodeStream.on("error", (err) => {
    // Log sanitized; response may already be partially sent so we can't change status
    console.error("[tts] stream error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "tts_failed" });
    } else {
      res.end();
    }
  });

  nodeStream.pipe(res);
});

export default router;
