# Jamie.ai

An AI-powered mock interviewer for investment banking and restructuring. Jamie asks questions out loud, listens to your spoken answers, and gives instant feedback — like a real interview, but on your schedule.

🔗 Live: [jamieai-production.up.railway.app](https://jamieai-production.up.railway.app)

---

## What it does

- **Two interview tracks** — Investment Banking (IB) covering the 400 M&I question bank, and Restructuring (RX) covering distressed finance and Chapter 11
- **Voice-first** — questions play via ElevenLabs TTS; you answer by holding to speak or tapping to toggle (Web Speech API), then press **Submit Answer** to be graded. Text fallback for unsupported browsers
- **Claude-powered evaluation** — answers are scored against expected key points by `claude-opus-4-8`, with a hit/miss breakdown and targeted feedback
- **Session summary** — overall score ring, per-category breakdowns, top missed concepts, and export to `.txt`

---

## Accounts & API keys

Jamie is multi-user. Each person signs up with an email + password (bcrypt-hashed) and supplies **their own** Anthropic and ElevenLabs API keys in **Account Settings**. Those keys are AES-256 encrypted at rest (keyed by `MASTER_ENCRYPTION_KEY`) and are used only to make that user's own Claude/TTS calls — they never reach the frontend. The server itself holds no shared API keys for evaluation or speech.

---

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Node.js, Express, SQLite (better-sqlite3) |
| Auth | Email/password (bcrypt) + bearer-token sessions |
| AI | Anthropic Claude — per-user key (answer evaluation) |
| TTS | ElevenLabs — per-user key |
| Speech recognition | Web Speech API (browser-native) |
| Frontend | React, Vite |
| Deploy | Docker → Railway |

---

## Local setup

### Prerequisites

- Node.js 18+
- (Per user, entered in-app — not server env) an Anthropic API key and an ElevenLabs API key

### Backend

```bash
cd backend
cp .env.example .env   # set MASTER_ENCRYPTION_KEY at minimum
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` to `localhost:3001`.

### Environment variables (server)

| Variable | Required | Description |
|---|---|---|
| `MASTER_ENCRYPTION_KEY` | **Yes** | 32-char secret used to AES-256 encrypt each user's stored API keys. If unset or wrong, saved keys can't be decrypted and Claude/TTS calls fail |
| `DB_PATH` | No | SQLite path (default `./jamie.db`; set to a mounted volume in production) |
| `PORT` | No | Server port (default `3001`) |
| `ELEVENLABS_VOICE_ID_IB` / `ELEVENLABS_VOICE_ID_RX` | No | Override the default TTS voices per mode (fall back to built-in ElevenLabs voices if unset) |

> Note: `ANTHROPIC_API_KEY` / `ELEVENLABS_API_KEY` still appear in `.env.example` but are **not** used for the core flow — evaluation and TTS use each logged-in user's own keys.

---

## Deployment (Railway)

The repo builds from the root `Dockerfile` (multi-stage: builds the Vite frontend, then serves it from the Express backend). On Railway:

1. **Set `MASTER_ENCRYPTION_KEY`** as a service variable — without it, stored user keys can't be decrypted.
2. **Attach a Volume** for SQLite persistence (the container filesystem is ephemeral and wiped on every deploy). Mount it at `/data` and set `DB_PATH=/data/jamie.db`. The backend auto-creates the parent directory on boot.
3. Push to `main` — Railway rebuilds and redeploys automatically (no CI gate; see Development below).

The question banks live under `backend/questions/` and are copied into the image via `COPY backend/ ./`.

---

## Architecture notes

**Question flow** — the frontend requests a question (passing an `exclude` list to avoid repeats), the backend returns it **without** the model answer, TTS plays it in the background while the question text shows immediately, and after the user records and submits, `/api/evaluate` proxies to Claude with a mode-specific system prompt. The next question + its audio are prefetched during the feedback screen, and TTS audio is cached by text to keep playback snappy.

**Interview state machine** — `LOADING → IDLE → LISTENING → PROCESSING → FEEDBACK → DONE`, managed with `useReducer`. TTS plays as a non-blocking background step (it does not gate the UI), and the user explicitly submits an answer to trigger evaluation. Skipped questions are never counted toward the session score.

**Question banks** — served from `backend/questions/` as JSON (`400-mi/` for IB, `rx/` for RX), keyed by category slugs from each mode's manifest/taxonomy. Generated from source PDFs (in `guides/`, gitignored) using the scripts in `scripts/`; the source PDFs and the derived banks are not redistributable.

---

## Interview modes

### Investment Banking (IB)
Covers Accounting, Enterprise/Equity Value, Valuation, DCF, M&A, LBO, and Brain Teasers at Basic and Advanced levels from the 400 M&I guide.

### Restructuring (RX)
Covers RX Overview, Capital Structure, Accounting, Bond Math, Credit Analysis, Chapter 11, Out-of-Court Restructuring, Recovery Analysis, and Distressed Investing at Basic and Advanced levels.

---

## Development

Railway auto-deploys every push to `main` with **no CI gate**, and `vite build` only catches syntax errors — not temporal-dead-zone, hook-order, logic, or missing-file bugs. Before pushing, run the crash-class lint and confirm your changed files are clean:

```bash
cd frontend && npm run build && npm run lint:crash
```

The full pre-push process (build → crash-lint → data-contract check → post-deploy render verification) is captured in the `ship-safely` project skill (`.claude/skills/ship-safely/`).

---

## License

This is a public repository, provided for reference. No open-source redistribution license is granted, and the interview question banks (derived from copyrighted prep guides) and source PDFs are intentionally excluded from the repo. If you intend to grant reuse rights, add an explicit `LICENSE` file.
