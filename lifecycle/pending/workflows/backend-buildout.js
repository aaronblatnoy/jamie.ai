export const meta = {
  name: 'backend-buildout',
  description:
    'Compile the jamie.ai backend buildout (Express + Claude + ElevenLabs, Node ESM) into a real multi-agent workflow. P0 boots the server (gates all). After P0, {P1 question-serving | P3 tts proxy | P4 two system prompts} run in GENUINE parallel. P2 (evaluate) awaits the barrier because it consumes P4 prompt files. A single serial WIRE step adds the three /api route mounts to index.js (shared-file, single-writer). P5 routes to the audit-duo workflow (two independent agents) to adversarially verify INV1 key-secrecy + INV3 no-model_answer-leak + the evaluate JSON contract — a confirmed leak HALTS and escalates (no self-review, no auto-fix of a security regression).',
  phases: [
    { title: 'Bootstrap', detail: 'npm install + index.js Express ESM skeleton (cors, json, /api/health, error mw, listen) + .env + .gitignore; server boots, /api/health green' },
    { title: 'Build leaves (parallel)', detail: 'P1 GET /api/question (questions-store + route), P3 POST /api/tts (ElevenLabs proxy), P4 two system prompts (ib + rx) — genuinely independent, run concurrently' },
    { title: 'Evaluate', detail: 'P2 POST /api/evaluate (anthropic.js + route) — awaits the barrier because it consumes P4 prompt files' },
    { title: 'Wire routes', detail: 'Serially add the three /api/{question,evaluate,tts} mount lines to index.js (single-writer to avoid the shared-file collision) and reboot-check' },
    { title: 'Verify (audit-duo)', detail: 'P5 adversarial security + integration gate via two independent agents: INV1 no key leak, INV3 no model_answer leak, evaluate JSON contract; confirmed leak halts + escalates' },
  ],
}

// ─── Config ────────────────────────────────────────────────────────────────────
// Run with:
//   Workflow({ scriptPath: '/Users/aaron_7nh0yzm/jamie.ai/lifecycle/pending/workflows/backend-buildout.js' })
// Optional args: { backendDir, planPath }

const BASE = '/Users/aaron_7nh0yzm/jamie.ai'
const PLAN = (args && args.planPath) ? args.planPath : BASE + '/lifecycle/pending/plans/backend-buildout.txt'
const BACKEND = (args && args.backendDir) ? args.backendDir : BASE + '/backend'
const INDEX = BACKEND + '/src/index.js'

// ─── Shared invariants (threaded into every builder prompt) ─────────────────────
const INVARIANTS = [
  'INVARIANTS (NON-NEGOTIABLE — your verify step must prove them):',
  '- INV1 KEY SECRECY: ANTHROPIC_API_KEY / ELEVENLABS_API_KEY must NEVER appear in any response body, header, or log line. All external calls stay server-side.',
  '- INV2 STATELESSNESS: the backend holds NO per-session state; the client passes exclude ids on each call.',
  '- INV3 NO MODEL-ANSWER LEAK: GET /api/question strips model_answer from the returned object (return ONLY {id,question,key_points,category,difficulty}).',
  '- INV4 MODE->PATH MAPPING: every disk read goes through ib->400-mi / rx->rx. NEVER hardcode a raw mode string as a directory name.',
  '- INV5 ESM ONLY (package.json "type":"module"): use import/export, node:fs/promises, and resolve paths via fileURLToPath(import.meta.url). NO __dirname, NO require().',
  '- INV6 CLAUDE CONFIG: model "claude-opus-4-8", thinking:{type:"adaptive"}, structured output via output_config.format (NOT the deprecated top-level output_format), and NEVER an assistant prefill (it 400s on this model).',
  '',
  'CONSTRAINTS: Touch ONLY the files named in your slice. Do NOT edit backend/src/index.js unless your slice explicitly says so (a later WIRE step owns the route mounts). Read env lazily inside handlers / client singletons, never at imported-module top level (dotenv loads first in index.js). Do NOT commit or push. Do NOT write .md report files. Print a one-line summary and exit.',
].join('\n')

// Per-phase result schema → JS does the gating, not a model.
const PHASE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['OK', 'BLOCKED'] },
    phase: { type: 'string' },
    summary: { type: 'string', description: 'one line of what was built' },
    files_touched: { type: 'array', items: { type: 'string' } },
    validation_passed: { type: 'boolean', description: 'did the slice-specific curl/boot checks pass' },
    key_gated: { type: 'boolean', description: 'true if a real API key was absent so a check could not run (NOT a failure)' },
    evidence: { type: 'string', description: 'curl output / file head / boot log proving the validation' },
    blocker: { type: 'string', description: 'if BLOCKED, the precise reason to escalate' },
  },
  required: ['status', 'phase', 'summary', 'files_touched', 'validation_passed', 'key_gated', 'evidence'],
}

const passed = (r) => r && r.status === 'OK' && r.validation_passed === true
const blocked = []
function note(r) { if (r && r.status === 'BLOCKED') blocked.push((r.phase || '?') + ': ' + (r.blocker || 'unspecified')) }

const COMMON = (id) =>
  `Execute Phase ${id} of the buildout plan at ${PLAN}. Read that plan's Section 1 (invariants), Section 2 (surface area), Assumptions, and the Phase ${id} block in full before editing. Working tree: ${BACKEND}.\n\n${INVARIANTS}`

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 0 — BOOTSTRAP  (single; gates everything)
// ═══════════════════════════════════════════════════════════════════════════════
phase('Bootstrap')

const p0 = await agent(
  `${COMMON(0)}

YOUR SLICE (P0): Stand up the Express ESM skeleton so the server boots.
1. In ${BACKEND}: run \`npm install\` (retry up to 2x on registry flakiness) and confirm @anthropic-ai/sdk resolves. Confirm \`node -v\` >= 18 (global fetch + node: specifiers).
2. Create ${INDEX}: import "dotenv/config" FIRST; const app = express(); app.use(cors()); app.use(express.json()); an /api express.Router(); GET /api/health -> res.json({ok:true}); const PORT = process.env.PORT || 3001; app.listen(PORT, log "listening on <PORT>"); a 4-arg error middleware that returns {error} (and an asyncHandler or try/catch so Express-4 async errors do not become unhandled rejections). Leave clearly-marked spots (or nothing — the WIRE step will insert) for future /api/question, /api/evaluate, /api/tts mounts; do NOT reference route files that do not exist yet.
3. Create ${BACKEND}/.env by copying ${BASE}/.env.example (keys may be blank — that is fine for boot).
4. Create ${BACKEND}/.gitignore ignoring node_modules/ and .env (create at repo root too if absent).

VALIDATION (must pass): \`npm run dev\` boots and logs "listening on 3001"; \`curl -s localhost:3001/api/health\` returns {"ok":true}; \`git status\` (if a repo) hides node_modules/ and .env. Capture the boot log line + curl output as evidence, then stop the server.
Return the schema. status=BLOCKED only if npm install or the Node version genuinely cannot be satisfied.`,
  { label: 'P0 bootstrap', phase: 'Bootstrap', model: 'sonnet', agentType: 'general-purpose', schema: PHASE_SCHEMA }
)
note(p0)
if (!passed(p0)) {
  return { done: false, haltedAt: 'P0', reason: 'Bootstrap failed — server does not boot; every later phase depends on it.', p0, blockers: blocked }
}
log('P0 green: ' + p0.summary)

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1 ∥ PHASE 3 ∥ PHASE 4  (genuinely independent after P0 — REAL parallel)
//   Each creates ONLY its own new file(s). None touches index.js (WIRE owns mounts).
//   P4 splits into two disjoint prompt files → both inside the same parallel barrier.
// ═══════════════════════════════════════════════════════════════════════════════
phase('Build leaves (parallel)')

const [p1, p3, p4ib, p4rx] = await parallel([
  () => agent(
    `${COMMON(1)}

YOUR SLICE (P1): question serving. Create exactly two new files (do NOT touch index.js):
- ${BACKEND}/src/lib/questions-store.js: MODE_DIR = {ib:"400-mi", rx:"rx"} (reject unknown mode). QUESTIONS_ROOT resolved from import.meta.url to <repo>/questions (backend/src/lib -> ../../../questions — VERIFY the depth and log the resolved root). listCategories(mode): ib -> read 400-mi/manifest.json sections[].slug (13 slugs; fallback to non-empty subdirs); rx -> enumerate questions/rx/ subdirectories (no manifest). loadCategory(mode,slug): readFile questions/<dir>/<slug>/questions.json; on ENOENT / empty / parse-error return [] (NEVER throw); cache parsed arrays in a module Map keyed \`\${mode}/\${slug}\`. (Per Assumptions A1-A3: the stale bare dirs accounting/dcf/valuation/lbo/ma/fit have been deleted; the manifest now uses basic/<category> and advanced/<category> slugs; RX is empty today so its loads legitimately return [].)
- ${BACKEND}/src/routes/questions.js: export an express.Router with GET /api/question. Parse mode(ib|rx, required else 400), categories(csv,opt), difficulty(1|2|3,opt), exclude(csv ids,opt). chosen = categories INTERSECT listCategories(mode) else all (ignore unknown slugs). Concatenate loadCategory across chosen; filter by difficulty if present; drop excluded ids. Empty pool -> res.json({done:true}). Else random pick and return ONLY {id,question,key_points,category,difficulty} (INV3 — strip model_answer).

VALIDATION (boot the server yourself to test; stop it after): ?mode=ib -> 5-key object with NO model_answer; ?mode=ib&categories=basic/accounting&difficulty=1 -> a difficulty-1 basic/accounting question; grow exclude until {done:true}; ?mode=rx -> {done:true} (RX empty today, this is CORRECT not a bug, must NOT 500); ?mode=bogus -> 400. Paste the ib / rx / bogus curl outputs as evidence. Return the schema.`,
    { label: 'P1 questions', phase: 'Build leaves (parallel)', model: 'sonnet', agentType: 'general-purpose', schema: PHASE_SCHEMA }
  ),
  () => agent(
    `${COMMON(3)}

YOUR SLICE (P3): ElevenLabs TTS proxy. Create exactly one new file (do NOT touch index.js):
- ${BACKEND}/src/routes/tts.js: export an express.Router with POST /api/tts. Body {text(required else 400), voice_id?, mode?}. voice = voice_id || (mode==="rx" ? process.env.ELEVENLABS_VOICE_ID_RX : process.env.ELEVENLABS_VOICE_ID_IB) || process.env.ELEVENLABS_VOICE_ID_IB (per Assumption A4 — TWO voices, .env.example is source of truth). fetch the ElevenLabs .../text-to-speech/\${voice}/stream endpoint via global fetch: POST, headers { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type":"application/json", "Accept":"audio/mpeg" }, body { text, model_id:"eleven_turbo_v2_5", voice_settings:{stability:0.5, similarity_boost:0.75} }. On upstream !ok: log a SANITIZED message (status + short text, NEVER the key) and respond 502 {error:"tts_failed"}. On ok: set res Content-Type audio/mpeg and bridge Readable.fromWeb(upstream.body).pipe(res) (import { Readable } from "node:stream"); on res 'close' destroy the upstream reader (backpressure/abort).

VALIDATION (boot + test; stop after): POST {text:"...",mode:"ib"} --output /tmp/out.mp3 then \`file /tmp/out.mp3\` reports MPEG/MP3 and size>0 (mark key_gated=true if ELEVENLABS_API_KEY is blank — a blank key should yield a clean 502, NOT a crash; verify THAT instead); missing text -> 400; bad key -> 502 JSON with NO key in the body. Paste \`file\` output (or the 502 body if key-gated) + the 400 body. Return the schema.`,
    { label: 'P3 tts', phase: 'Build leaves (parallel)', model: 'sonnet', agentType: 'general-purpose', schema: PHASE_SCHEMA }
  ),
  () => agent(
    `${COMMON(4)} (IB sibling)

YOUR SLICE (P4-IB): write ONLY ${BACKEND}/src/prompts/ib-system.txt. Jamie — a professional, direct, no-fluff investment-banking interviewer. Instruct the model to: score the candidate answer ONLY against the supplied key_points (the rubric — note model_answer is NOT provided to evaluate, only key_points); hit[] = key_points the answer covered, missed[] = key_points not covered; feedback_line = ONE spoken sentence read aloud by TTS (no markdown, no lists); score = integer 0-100 (coverage + correctness); ALWAYS return the JSON object with no preamble. claude-opus-4-8 follows instructions literally — avoid CRITICAL/YOU-MUST over-prescription and do NOT re-spell the JSON schema in prose beyond a short reminder (output_config.format enforces it). No prefill scaffolding in the file.
VALIDATION: file is non-empty, names "Jamie", states the hit/missed/feedback/score rubric + JSON-only. Evidence: print the first 6 lines. Return the schema (phase="P4-IB").`,
    { label: 'P4 ib-prompt', phase: 'Build leaves (parallel)', model: 'sonnet', agentType: 'general-purpose', schema: PHASE_SCHEMA }
  ),
  () => agent(
    `${COMMON(4)} (RX sibling)

YOUR SLICE (P4-RX): write ONLY ${BACKEND}/src/prompts/rx-system.txt. Same structure and SAME JSON contract as the IB prompt, but a restructuring persona: a more technically demanding tone that rewards depth on distressed concepts (chapter 11 / plan of reorganization, recovery & waterfall analysis, credit & covenant analysis, capital structure & debt instruments). Score ONLY against the supplied key_points; hit[]/missed[]; feedback_line = ONE spoken sentence (no markdown); score integer 0-100; always return the JSON object, no preamble. Same anti-over-prescription guidance; no prefill scaffolding.
VALIDATION: file is non-empty, names "Jamie", states the rubric + JSON-only. Evidence: print the first 6 lines. Return the schema (phase="P4-RX").`,
    { label: 'P4 rx-prompt', phase: 'Build leaves (parallel)', model: 'sonnet', agentType: 'general-purpose', schema: PHASE_SCHEMA }
  ),
])
;[p1, p3, p4ib, p4rx].forEach(note)
const promptsOK = passed(p4ib) && passed(p4rx)
if (!promptsOK) {
  return { done: false, haltedAt: 'P4', reason: 'A system-prompt sibling failed — P2 (evaluate) cannot meaningfully validate without both prompts.', p4ib, p4rx, blockers: blocked }
}
log('Parallel wave done. P1=' + p1.status + ' P3=' + p3.status + ' P4ib/rx=OK')

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — EVALUATE  (awaits the barrier: consumes the P4 prompt files)
//   Creates ONLY its own two files; does NOT touch index.js.
// ═══════════════════════════════════════════════════════════════════════════════
phase('Evaluate')

const p2 = await agent(
  `${COMMON(2)}

YOUR SLICE (P2): Claude scoring. The two prompt files ${BACKEND}/src/prompts/ib-system.txt and rx-system.txt already exist (P4). Create exactly two new files (do NOT touch index.js):
- ${BACKEND}/src/lib/anthropic.js: import Anthropic from "@anthropic-ai/sdk". A lazy getClient() singleton reading process.env.ANTHROPIC_API_KEY (NOT at module top level). EVAL_SCHEMA = object, additionalProperties:false, properties { hit: array<string>, missed: array<string>, feedback_line: string, score: integer }, required all four. evaluateAnswer({system,question,key_points,user_answer}) calls client.messages.create({ model:"claude-opus-4-8", max_tokens:2048, thinking:{type:"adaptive"}, system, output_config:{format:{type:"json_schema", schema:EVAL_SCHEMA}}, messages:[{role:"user", content:<labeled question + bulleted key_points + the candidate answer>}] }) — NO assistant prefill (INV6/A7). Parse the FIRST text block, JSON.parse it, validate shape, clamp score into [0,100], coerce hit/missed to arrays; on parse failure throw a typed error the route maps to 502.
- ${BACKEND}/src/routes/evaluate.js: export an express.Router with POST /api/evaluate. Validate body {question, key_points:string[], user_answer, mode:"ib"|"rx"} — 400 if question/user_answer missing or mode not in {ib,rx}. readFile prompts/\${mode}-system.txt (cache it). Call evaluateAnswer and return {hit,missed,feedback_line,score}. Wrap in asyncHandler; map upstream/parse failures to a GENERIC 502 (INV1 — never leak the key or the raw SDK error).

VALIDATION (boot + test; stop after): with a real ANTHROPIC_API_KEY, a PARTIAL answer returns {hit,missed,feedback_line,score} with score in [0,100] and missed non-empty; a STRONG answer scores higher with missed ~empty; omitting user_answer -> 400; mode=bogus -> 400; no thinking text or raw SDK payload in the response. If ANTHROPIC_API_KEY is blank, mark key_gated=true and instead prove body-validation (the two 400s) + that a missing key yields a clean 502 (not a crash). Paste the partial + strong responses (or the 502) and the 400. Return the schema.
Failure recovery: a 400 from the API about prefill/output_config means re-check INV6 (no prefill; output_config.format not top-level output_format) and retry once.`,
  { label: 'P2 evaluate', phase: 'Evaluate', model: 'sonnet', agentType: 'general-purpose', schema: PHASE_SCHEMA }
)
note(p2)
// P2 may legitimately be key_gated (no ANTHROPIC key). Gate on validation OR key-gated-but-built.
const p2OK = passed(p2) || (p2 && p2.status === 'OK' && p2.key_gated === true)
if (!p2OK) {
  return { done: false, haltedAt: 'P2', reason: 'Evaluate route failed its non-key-gated checks.', p2, blockers: blocked }
}
log('P2 done: ' + p2.summary + (p2.key_gated ? ' (key-gated)' : ''))

// ═══════════════════════════════════════════════════════════════════════════════
// WIRE — single serial writer adds the three route mounts to index.js (§12.2)
//   Kept out of the parallel wave on purpose: index.js is a shared file.
// ═══════════════════════════════════════════════════════════════════════════════
phase('Wire routes')

const wire = await agent(
  `${COMMON('wire (route mounting)')}

YOUR SLICE (WIRE): these three route files now exist and export express Routers:
  ${BACKEND}/src/routes/questions.js, ${BACKEND}/src/routes/evaluate.js, ${BACKEND}/src/routes/tts.js
This is the ONLY step permitted to edit ${INDEX}. Add the three imports and mount them on the /api router (or app) at /api/question, /api/evaluate, /api/tts respectively, using extensionless-aware ESM import paths that match how the route files export (default export vs named — open each file to confirm before wiring). Preserve everything already in index.js (dotenv-first, cors, json, /api/health, the 4-arg error middleware, listen). Do NOT change any route-handler logic.

VALIDATION (boot + test; stop after): \`npm run dev\` boots clean with NO import error and logs "listening"; curl /api/health -> {"ok":true}; curl "/api/question?mode=ib" returns a question object (or {done:true}); POST /api/evaluate and POST /api/tts each reach their handler (a 400 on empty body proves the mount — they need not succeed end-to-end here). Paste the boot log + the four route reachability results. Return the schema (phase="WIRE").`,
  { label: 'WIRE route mounts', phase: 'Wire routes', model: 'sonnet', agentType: 'general-purpose', schema: PHASE_SCHEMA }
)
note(wire)
if (!passed(wire)) {
  return { done: false, haltedAt: 'WIRE', reason: 'Route mounting failed — server does not boot with all routes mounted; cannot run the integration gate.', wire, blockers: blocked }
}
log('WIRE done: all routes mounted, server boots.')

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — VERIFY  (plan names consensus-verification-duo → route to audit-duo:
//   TWO genuinely independent agents, separate contexts, cross-examined.
//   NEVER agent({agentType:'consensus-verification-duo'}) — that nests + collapses.)
// ═══════════════════════════════════════════════════════════════════════════════
phase('Verify (audit-duo)')

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL', 'PASS_WITH_KEY_GATES'] },
    inv1_no_key_leak: { type: 'boolean', description: 'no ANTHROPIC/ELEVENLABS key in any body, header, or log line' },
    inv3_no_model_answer_leak: { type: 'boolean', description: 'GET /api/question never returns model_answer' },
    evaluate_contract_ok: { type: 'boolean', description: 'hit/missed arrays, feedback_line string, score 0-100 integer' },
    key_gated_steps: { type: 'array', items: { type: 'string' }, description: 'endpoints unverifiable because a real key was absent' },
    confirmed_breaks: { type: 'array', items: { type: 'string' }, description: 'CONFIRMED invariant breaks (each must HALT + escalate)' },
    evidence: { type: 'string', description: 'per-endpoint snippets + grep results proving no key / no model_answer' },
  },
  required: ['verdict', 'inv1_no_key_leak', 'inv3_no_model_answer_leak', 'evaluate_contract_ok', 'key_gated_steps', 'confirmed_breaks', 'evidence'],
}

const p5 = await workflow('audit-duo', {
  claim:
    'The jamie.ai backend is correctly and securely built per its buildout plan: GET /api/health -> {ok:true}; GET /api/question (mode=ib filters by category/difficulty/exclude, returns ONLY {id,question,key_points,category,difficulty} with NO model_answer, {done:true} when exhausted; mode=rx -> {done:true} today; bogus mode -> 400); POST /api/evaluate returns {hit:string[],missed:string[],feedback_line:string,score:0-100 int}; POST /api/tts streams audio/mpeg; and CRITICALLY neither ANTHROPIC_API_KEY nor ELEVENLABS_API_KEY appears in ANY response body, header, or log line (INV1) and model_answer never leaks via /api/question (INV3).',
  context:
    `Boot the backend in ${BACKEND} (\`npm run dev\`, PORT 3001) with whatever keys are present in ${BACKEND}/.env, then independently and adversarially smoke ALL endpoints and verify the claim. The two agents must each scan response bodies, headers, AND the server's stdout/stderr logs for leaked secrets (grep for the literal key values from .env and for "xi-api-key"/"ANTHROPIC_API_KEY"), and confirm no model_answer key appears in any /api/question response. The plan is at ${PLAN} (read Sections 0-2 and Phase 5). Treat any key-gated step (real key absent) as UNVERIFIED, not as PASS. A CONFIRMED key leak or model_answer leak is a security regression: report it as a confirmed_break — do NOT fix it yourselves and do NOT rationalize it away. Return the structured verdict.`,
  maxRounds: 3,
  schema: VERDICT_SCHEMA,
})

// Deterministic gate on the duo's verdict — JS decides, not a model.
const leaks = (p5 && p5.confirmed_breaks) ? p5.confirmed_breaks : []
const secInvariantsHeld = p5 && p5.inv1_no_key_leak === true && p5.inv3_no_model_answer_leak === true && leaks.length === 0

if (!p5) {
  return { done: false, haltedAt: 'P5', reason: 'audit-duo returned no verdict.', blockers: blocked }
}
if (!secInvariantsHeld) {
  return {
    done: false,
    haltedAt: 'P5',
    reason: 'SECURITY REGRESSION — audit-duo confirmed an invariant break (INV1 key secrecy and/or INV3 model_answer leak). Per plan §12.5, PAUSE and escalate for sign-off; do NOT auto-fix.',
    confirmed_breaks: leaks,
    verdict: p5,
    blockers: blocked,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DONE
// ═══════════════════════════════════════════════════════════════════════════════
return {
  done: true,
  summary: 'jamie.ai backend built and verified: P0 boots, {P1 question | P3 tts | P4 prompts} parallel, P2 evaluate, routes wired, audit-duo confirmed INV1/INV3 + evaluate contract.',
  verdict: p5.verdict,
  security: { inv1_no_key_leak: p5.inv1_no_key_leak, inv3_no_model_answer_leak: p5.inv3_no_model_answer_leak, evaluate_contract_ok: p5.evaluate_contract_ok },
  key_gated_steps: p5.key_gated_steps || [],
  phases: {
    P0: p0.summary,
    P1: p1.summary,
    P2: p2.summary + (p2.key_gated ? ' (key-gated)' : ''),
    P3: p3.summary + (p3.key_gated ? ' (key-gated)' : ''),
    P4: 'ib + rx system prompts written',
    WIRE: wire.summary,
    P5: p5.verdict,
  },
  blockers: blocked,
  open_questions: [
    'Q1 voices: plan uses TWO voices (_IB/_RX) per .env.example, not the one ELEVENLABS_VOICE_ID the request mentioned — confirm or collapse.',
    'Q2 CLAUDE.md drift: live per-category layout under questions/{400-mi,rx}/ used, not the stale consolidated backend/src/data/ banks — confirm CLAUDE.md is stale.',
    'Q3 RX readiness: /api/question?mode=rx returns {done:true} until questions.json lands with the SAME shape as IB.',
    'Q4 TTS model_id/voice_settings: defaulted to eleven_turbo_v2_5 + neutral settings — confirm or expose as env.',
    'Q5 behavioral mode: out of scope (no behavioral data on disk); mode->dir mapper extends cleanly to a third mode if wanted later.',
  ],
}
