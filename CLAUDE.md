# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Jamie.ai is an AI-powered mock investment banking interviewer. It asks questions out loud (ElevenLabs TTS), listens to the user's spoken answer (Web Speech API STT), evaluates the answer against expected key points (Claude), and reads back feedback. Two modes: traditional IB (400 M&I guide) and Restructuring (RX guide).

## Stack

- **Backend**: Node.js + Express — API proxy for Claude and ElevenLabs, question serving, answer evaluation
- **Frontend**: React + Vite
- **STT**: Browser Web Speech API (no backend needed)
- **TTS**: ElevenLabs API
- **LLM**: Claude API (Anthropic) — use `claude-opus-4-8` for answer evaluation and guide parsing

## Dev commands

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

## Architecture

**Data flow per question:**
1. Frontend requests a question from `GET /api/question?mode=ib|rx`
2. Backend returns question + key_points from the parsed question bank
3. Frontend calls `POST /api/tts` → backend proxies to ElevenLabs → audio plays
4. User holds push-to-talk; Web Speech API transcribes in real time
5. On release, frontend calls `POST /api/evaluate` with `{ question, key_points, user_answer }`
6. Backend sends to Claude with the mode-specific system prompt; Claude returns `{ hit[], missed[], feedback_line, score }`
7. Frontend plays feedback via TTS, shows scored key points, advances to next question

**Question banks** live in `backend/src/data/` as JSON (`ib-questions.json`, `rx-questions.json`). Each entry:
```json
{ "id": "", "category": "", "difficulty": 1-3, "question": "", "key_points": [], "model_answer": "" }
```

Parsed from raw PDFs in `guides/` using `scripts/parse-guide.py`.

**System prompts** in `backend/src/prompts/` (`ib-system.txt`, `rx-system.txt`) set the interviewer persona and scoring rubric per mode. RX prompt emphasizes distressed situations, recovery analysis, chapter 11 process.

**Session state** is held client-side: which questions have been asked, scores per question, category breakdowns. End-of-session summary shows weak categories and missed key points.

## Key design decisions

- API keys never reach the frontend — all Claude and ElevenLabs calls are proxied through the backend
- Mode (ib/rx) is selected once at session start and passed as a param on every API call
- STT starts with Web Speech API; swap to Deepgram if accuracy is a problem
- Question selection is random within a category filter; no repeats within a session
