# Jamie.ai

An AI-powered mock interviewer for investment banking and restructuring. Jamie asks questions out loud, listens to your spoken answers, and gives instant feedback — like a real interview, but on your schedule.

---

## What it does

- **Two interview tracks** — Investment Banking (IB) covering the 400 M&I question bank, and Restructuring (RX) covering distressed finance and Chapter 11
- **Voice-first** — questions play via ElevenLabs TTS; you answer by holding to speak or tapping to toggle (Web Speech API). Text fallback for unsupported browsers
- **Claude-powered evaluation** — answers are scored against expected key points by claude-opus-4-8, with a hit/miss breakdown and targeted feedback
- **Session summary** — overall score ring, per-category breakdowns, top missed concepts, and export to `.txt`

---

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Node.js, Express, SQLite (better-sqlite3) |
| AI | Anthropic Claude (answer evaluation) |
| TTS | ElevenLabs |
| Speech recognition | Web Speech API (browser-native) |
| Frontend | React, Vite |

---

## Setup

### Prerequisites

- Node.js 18+
- Anthropic API key
- ElevenLabs API key + voice IDs (one for IB, one for RX)

### Backend

```bash
cd backend
cp .env.example .env   # fill in your keys
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies to `localhost:3001` by default.

### Environment variables

Copy `backend/.env.example` and fill in:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ELEVENLABS_VOICE_ID_IB` | Voice ID for IB mode |
| `ELEVENLABS_VOICE_ID_RX` | Voice ID for RX mode |
| `MASTER_ENCRYPTION_KEY` | 32-char secret for AES-256 encryption of stored user keys |
| `PORT` | Server port (default: 3001) |
| `DB_PATH` | SQLite path (default: `./jamie.db`) |

---

## Architecture notes

**API key security** — user API keys are never exposed to the frontend. All Claude and ElevenLabs calls are proxied through the backend, and keys are stored AES-256 encrypted in SQLite.

**Question flow** — the frontend requests a question (with an exclude list to avoid repeats), the backend returns it without the model answer, TTS plays it, and after the user answers, `/api/evaluate` proxies to Claude with a mode-specific system prompt.

**Interview state machine** — `LOADING → SPEAKING → IDLE → LISTENING → PROCESSING → FEEDBACK → DONE`, managed with `useReducer`. Skipped questions are never counted toward the session score.

**Question banks** — served from `backend/src/data/` as JSON. Generate your own from source PDFs using `scripts/parse-guide.py` (PDFs not included).

---

## Interview modes

### Investment Banking (IB)
Covers Accounting, Valuation, DCF, M&A, LBO, and Brain Teasers at Basic and Advanced levels from the 400 M&I guide.

### Restructuring (RX)
Covers RX Overview, Capital Structure, Accounting, Bond Math, Credit Analysis, Chapter 11, Out-of-Court Restructuring, Recovery Analysis, and Distressed Investing.

---

## License

Private — not for redistribution.
