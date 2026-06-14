export const meta = {
  name: 'jamie-frontend-buildout',
  description:
    'Build the jamie.ai React frontend from an empty frontend/src/: routing+CSS scaffold, auth context+api client, auth screens, API-key wizard, mode select, session config, interview loop, summary, account settings, responsive/a11y polish, then a smoke-test verification gate.',
  phases: [
    { title: 'P1 Scaffold', detail: 'deps (react-router-dom, canvas-confetti), main.jsx, App.jsx router + ProtectedRoute/AuthRoute guards, index.css design system + utility classes, stub every screen; npm run build exits 0' },
    { title: 'P2 Auth core', detail: 'AuthContext.jsx (login/logout/me bootstrap + full-screen loading spinner), useAuth.js guard hook, lib/api.js (apiFetch/apiGet/apiPost, Bearer header, never-throws {ok,status,data}); build green' },
    { title: 'P3 Auth screens', detail: 'LandingPage, SignUpScreen, SignInScreen — pre-auth screens, inline validation, login() + navigate to /setup-keys or /app' },
    { title: 'P4 API-key wizard', detail: 'ApiKeySetup shell + StepIndicator + KeyStep (anthropic/elevenlabs) + VerifyStep + ui/PasswordInput; canvas-confetti on all-valid; fix-my-keys re-entry' },
    { title: 'P5 Mode select', detail: 'ModeSelect — header w/ gear -> /settings, 3 mode cards (IB/RX/Behavioral) navigating to /app/configure?mode=, voice-status note' },
    { title: 'P9 Account settings', detail: 'AccountSettings (keys status w/ relativeTime, inline update+verify, password change, sign out) + ui/Toast (ToastContext/useToast). Independent after P2.' },
    { title: 'P6 Session config', detail: 'SessionConfig — read ?mode=, per-mode category chip groups (IB basic/advanced slugs), count, voice toggle, input mode; writes sessionStorage jamie_session_config; navigate /app/interview' },
    { title: 'P7 Interview loop', detail: 'InterviewScreen useReducer phase machine + QuestionCard/JamieBlob/PushToTalkButton/TranscriptPreview/FeedbackPanel/SessionProgress; Web Speech STT + /api/tts + /api/evaluate; skip-erasure; voice/STT graceful degradation' },
    { title: 'P8 Summary', detail: 'SummaryScreen from location.state — overall score ring, category breakdown, weak-areas, most-missed key points, .txt export; NaN/empty guards' },
    { title: 'P10 Responsive + a11y polish', detail: 'responsive breakpoints, labels/focus outlines/aria-live/aria-valuenow, ui/Spinner, ui/ErrorBoundary wrapping screen groups, loading states' },
    { title: 'P11 Smoke-test gate', detail: 'independent verifier: npm run build + static scan of the Phase-11 checklist (routes, guards, wizard re-entry, skip-erasure, voice degradation, a11y) -> structured verdict; gates "done"' },
  ],
};

// ---- shared invariants threaded into every build brief ----
const FRONTEND = 'frontend';
const INVARIANTS = `
PROJECT: jamie.ai React frontend. Work ONLY inside ${FRONTEND}/src/ (plus ${FRONTEND}/package.json in Phase 1). Do NOT touch the backend.

PLAN IS AUTHORITATIVE. The full plan is at lifecycle/pending/plans/frontend-buildout.txt — READ the relevant phase section in full before writing code; the brief below is a summary, the plan has the exact copy, field names, route table, CSS var names, and acceptance criteria. Match them exactly.

HARD INVARIANTS (from the plan's DESIGN DECISIONS):
- D2 URL routing via React Router v6. Use <Navigate replace>, useNavigate, useSearchParams. Session result arrays travel via location.state, NOT the URL.
- D3 PLAIN CSS ONLY. No Tailwind, no PostCSS, no component library, no icon library, no date library. (The repo CLAUDE.md mentions Tailwind — the PLAN overrides it: plain CSS with custom properties only.) Only two runtime deps total: react-router-dom and canvas-confetti.
- D1 API keys never displayed/returned after submission. Raw key appears ONLY in the masked PasswordInput during entry. Settings shows verified STATUS, never the key value.
- D4 Voice degrades gracefully at two levels: no ElevenLabs key -> voice toggle hidden, text-only; SpeechRecognition unsupported (Firefox/Safari) -> textarea fallback. App fully usable without voice.
- D5 Session config in sessionStorage('jamie_session_config'); D6 frontend assumes backend transparently uses per-user keys (just send Bearer token).
- Auth: JWT in localStorage('jamie_token'); every API call sends Authorization: Bearer {token} via lib/api.js. Never hard-code a host (Vite proxies /api -> :3001).
- OQ1: assume evaluate score is 0.0–1.0 (multiply by 100 for display) unless code already shows otherwise.

CONSISTENCY: import the EXACT component/file paths listed in the plan's "FILES TO CREATE" so sibling phases' imports resolve. Use the EXACT CSS custom-property names and utility class names defined in Phase 1's index.css (--color-*, .btn-primary, .card, .input-field, .form-group, .label, .link, .error-text, .success-text, .divider, .spinner). Do NOT invent parallel class names.

VERIFY before you return: from ${FRONTEND}/, run \`npm run build\` and confirm it exits 0 with no unresolved imports. Report the build result in your structured output. Do NOT mark a phase done on a red build.
`;

const buildSchema = {
  type: 'object',
  required: ['filesCreated', 'buildPassed', 'summary'],
  properties: {
    filesCreated: { type: 'array', items: { type: 'string' }, description: 'paths under frontend/src/ created or edited' },
    buildPassed: { type: 'boolean', description: 'npm run build exited 0 with no unresolved imports' },
    deviations: { type: 'array', items: { type: 'string' }, description: 'any deviation from the plan + why' },
    blockers: { type: 'array', items: { type: 'string' }, description: 'anything that blocked completion (empty if none)' },
    summary: { type: 'string' },
  },
};

function brief(planSection, body) {
  return `${INVARIANTS}\n\nYOUR PHASE: ${planSection}\n\n${body}\n\nWhen done, return the structured result (filesCreated, buildPassed, deviations, blockers, summary).`;
}

  log('jamie.ai frontend buildout — compiling empty frontend/src/ into the full app.');

  // ===== P1 — SCAFFOLD (strictly sequential; gates everything) =====
  phase('P1 Scaffold');
  const p1 = await agent(
    brief(
      'PHASE 1 — SCAFFOLD: DEPS, ROUTING, CSS, ENTRY POINT (plan lines ~56-132).',
      `Do all of 1.1–1.6:
- 1.1 \`npm install react-router-dom canvas-confetti\` in frontend/ (adds to package.json).
- 1.2 src/main.jsx: ReactDOM.createRoot(#root), <BrowserRouter><App/></BrowserRouter>, import './index.css'.
- 1.3 src/App.jsx: the EXACT React Router v6 route table from 1.3, incl. <ProtectedLayout> with index/configure/interview/summary children, <ProtectedRoute> (no token -> <Navigate to="/signin" replace/>), <AuthRoute> (token -> <Navigate to="/app" replace/>), and catch-all -> '/'. App must be wrapped so AuthContext can be added in P2 — leave a clearly-marked <AuthProvider> wrapper seam (you may import a placeholder now; P2 fills it). Simplest: App.jsx renders <AuthProvider><Routes>...</Routes></AuthProvider> and you create a TRIVIAL passthrough AuthProvider stub now if needed, BUT prefer to leave the file so P2 can implement AuthContext without restructuring App. Use a minimal stub guard that reads localStorage('jamie_token') directly for now so routing is verifiable; P2 will swap it to useAuth.
- 1.4 src/index.css: ALL the :root custom properties listed (exact hex + names), the body/box-sizing base, and EVERY utility class in 1.4 (.btn-primary/.btn-secondary/.btn-ghost/.btn-danger/.input-field/.card/.form-group/.label/.link/.error-text/.success-text/.divider/.spinner).
- 1.5 Stub every screen in the FILES TO CREATE list as a <div><h1>Name</h1></div> so all routes render. Create the directory structure (screens/, context/, hooks/, lib/, components/{setup,interview,ui}).
- 1.6 Confirm \`npm run dev\` would boot and \`npm run build\` exits 0.
This phase is the contract for all downstream phases — get the route paths, file paths, CSS var names, and utility class names exactly right.`,
    ),
    { label: 'p1-scaffold', phase: 'P1 Scaffold', schema: buildSchema, model: 'sonnet' },
  );
  if (!p1.buildPassed || (p1.blockers && p1.blockers.length)) {
    log('HALT: P1 scaffold did not pass build / reported blockers. Downstream phases depend on it.');
    return { status: 'blocked', failedPhase: 'P1', detail: p1 };
  }

  // ===== P2 — AUTH CONTEXT, useAuth, API CLIENT (sequential after P1) =====
  phase('P2 Auth core');
  const p2 = await agent(
    brief(
      'PHASE 2 — AUTH CONTEXT, useAuth HOOK, API CLIENT (plan lines ~135-228).',
      `Build 2.1–2.3 and wire them into App.jsx from P1:
- 2.1 src/context/AuthContext.jsx: context shape { user, token, isLoading, login(token,user), logout() }; user shape per 2.1; <AuthProvider> mount behavior (read jamie_token, GET /api/auth/me, 200 -> set state, 401/network -> clear localStorage; no token -> isLoading=false immediately); login() persists token; logout() best-effort POST /api/auth/logout + clear + navigate('/'); while isLoading render a full-screen <Spinner> to avoid layout flash.
- 2.2 src/hooks/useAuth.js: useContext(AuthContext) with undefined guard that throws.
- 2.3 src/lib/api.js: apiFetch(path,options) — relative path, reads jamie_token, merges Bearer when present, sets Content-Type when body present, returns { ok, status, data } and NEVER throws on 4xx/5xx; network failure -> { ok:false, status:0, data:null }. Plus apiGet/apiPost wrappers.
- Replace P1's direct-localStorage stub guards in App.jsx's ProtectedRoute/AuthRoute with reads from useAuth() (token + isLoading). Ensure AuthProvider wraps Routes.
- 2.4 is BACKEND work (routes + user model) — DO NOT implement backend. The frontend just consumes those endpoints. If a small inline spinner is needed before ui/Spinner exists (P10 owns it), create a minimal src/components/ui/Spinner.jsx now (pure CSS ring per the plan) — P10 will reconcile/own it.
This is the LAST sequential foundation phase; P3/P4/P5/P9 import api.js + useAuth.`,
    ),
    { label: 'p2-auth-core', phase: 'P2 Auth core', schema: buildSchema, model: 'sonnet' },
  );
  if (!p2.buildPassed || (p2.blockers && p2.blockers.length)) {
    log('HALT: P2 auth core did not pass build / reported blockers.');
    return { status: 'blocked', failedPhase: 'P2', detail: p2 };
  }

  // ===== P3 + P4 + P5 + P9 — GENUINELY PARALLEL after P2 =====
  // Disjoint file sets; worktree isolation so concurrent builds don't collide.
  // P9 is independent after P2 and shares only AuthContext/api.js -> folds into this fan-out.
  phase('P3 Auth screens');
  const [p3, p4, p5, p9] = await parallel([
    () =>
      agent(
        brief(
          'PHASE 3 — AUTH SCREENS: LANDING, SIGN UP, SIGN IN (plan lines ~231-311).',
          `Replace the P1 stubs with real screens: src/screens/LandingPage.jsx (3.1 — wordmark, hero H1/subhead, 3 value-prop glyph items, two CTAs -> /signup & /signin, footer cost line), src/screens/SignUpScreen.jsx (3.2 — email/password/confirm, on-submit inline validation, login()+navigate('/setup-keys') on 201, 409 handling, link to /signin), src/screens/SignInScreen.jsx (3.3 — email/password, on 200 navigate /app or /setup-keys per hasAnthropicKey, 401 message, forgot-password contact note). Use apiPost from lib/api.js and login() from useAuth. Touch ONLY these three screen files.`,
        ),
        { label: 'p3-auth-screens', phase: 'P3 Auth screens', schema: buildSchema, model: 'sonnet' },
      ),
    () =>
      agent(
        brief(
          'PHASE 4 — API KEY SETUP WIZARD (plan lines ~314-452).',
          `Build the wizard: src/screens/ApiKeySetup.jsx (4.1 shell, step 1|2|3 + anthropicKey/elevenLabsKey state), src/components/setup/StepIndicator.jsx (4.2), src/components/ui/PasswordInput.jsx (4.3 — reusable masked input with inline SVG eye toggle; used here AND by P9 settings — match the exact prop API: value,onChange,placeholder,label,name,autoComplete), src/components/setup/KeyStep.jsx (4.4 anthropic + 4.5 elevenlabs variants incl. explicit Skip -> elevenLabsKey=null), src/components/setup/VerifyStep.jsx (4.6 — POST /api/user/keys/verify on mount, status table, canvas-confetti on all-valid, [Start Practicing] refreshes /api/auth/me + login() then navigate('/app'), invalid -> [Fix my keys] pre-fills passed key & clears failed one + [Try again]). Use apiPost + canvas-confetti. Touch ONLY these wizard files + PasswordInput.`,
        ),
        { label: 'p4-key-wizard', phase: 'P4 API-key wizard', schema: buildSchema, model: 'sonnet' },
      ),
    () =>
      agent(
        brief(
          'PHASE 5 — MODE SELECT SCREEN (plan lines ~455-493).',
          `Replace the stub src/screens/ModeSelect.jsx with the real screen: 5.1 header (wordmark + gear -> /settings), 5.2 three mode cards (IB/RX/Behavioral, glyph + title + sub-label + one-line desc + [Start ->]) where card AND button navigate to /app/configure?mode=ib|rx|behavioral (URL param so back/deep-link work), 5.3 voice-status note keyed on user.hasElevenLabsKey (link to /settings when off). Read user from useAuth. Touch ONLY ModeSelect.jsx.`,
        ),
        { label: 'p5-mode-select', phase: 'P5 Mode select', schema: buildSchema, model: 'sonnet' },
      ),
    () =>
      agent(
        brief(
          'PHASE 9 — ACCOUNT SETTINGS SCREEN (plan lines ~739-796). Independent after P2.',
          `Build src/screens/AccountSettings.jsx and src/components/ui/Toast.jsx:
- 9.1 header + back-to-practice link. 9.2 API Keys section: two rows (Anthropic, ElevenLabs) with verified status + relativeTime(verifiedAt) helper (plain JS thresholds per 9.2: just now / N minutes/hours/days ago / ISO), inline accordion [Update]/[Add] -> <PasswordInput> + [Save & Verify] -> POST /api/user/keys/verify -> inline ✓/✗ -> on success GET /api/auth/me + login() to refresh context. 9.3 Password section: current/new/confirm PasswordInputs + [Update Password] -> POST /api/auth/password (200 success toast, 401 inline error, validate >=8 + match). 9.4 Account section (.divider) [Sign Out] btn-danger -> logout(). 9.5 Toast: ToastContext + useToast hook (or lightweight singleton), bottom-right, auto-dismiss 4s, success/error/info variants.
- IMPORT src/components/ui/PasswordInput.jsx (built by P4) — do NOT create your own copy; depend on the exact path. Touch ONLY AccountSettings.jsx + ui/Toast.jsx.`,
        ),
        { label: 'p9-settings', phase: 'P9 Account settings', schema: buildSchema, model: 'sonnet' },
      ),
  ]);

  const fanout = { p3, p4, p5, p9 };
  const fanoutBlocked = Object.entries(fanout).filter(
    ([, r]) => !r.buildPassed || (r.blockers && r.blockers.length),
  );
  if (fanoutBlocked.length) {
    log(`HALT: parallel fan-out phase(s) blocked: ${fanoutBlocked.map(([k]) => k).join(', ')}.`);
    return { status: 'blocked', failedPhase: fanoutBlocked.map(([k]) => k).join('+'), detail: fanout };
  }

  // ===== P6 — SESSION CONFIG (after P5: validates ?mode= hand-off) =====
  phase('P6 Session config');
  const p6 = await agent(
    brief(
      'PHASE 6 — SESSION CONFIG SCREEN (plan lines ~496-565).',
      `Build src/screens/SessionConfig.jsx: 6.1 useSearchParams mode, validate ib|rx|behavioral else navigate('/app'). 6.2 header + back. 6.3 per-mode category chip groups — IB parent categories with Basic/Advanced sub-toggles mapping to -basic/-advanced slug suffixes + Brain Teasers single toggle + Select All; RX All-or-manifest fallback empty state; Behavioral 7 named categories. 6.4 voice toggle gated on user.hasElevenLabsKey. 6.5 input-mode radio (hold/tap). 6.6 feedback-after-each (note batch = coming soon). 6.7 [Start Session]: validate >=1 category + count, build { mode, categories:[slugs], count, voiceEnabled, inputMode }, sessionStorage('jamie_session_config'), navigate('/app/interview'). 6.8 back -> /app. This screen DEFINES the sessionStorage config contract that P7 reads — make the shape exact. Touch ONLY SessionConfig.jsx.`,
    ),
    { label: 'p6-session-config', phase: 'P6 Session config', schema: buildSchema, model: 'sonnet' },
  );
  if (!p6.buildPassed || (p6.blockers && p6.blockers.length)) {
    log('HALT: P6 session config blocked; P7/P8 depend on its config contract.');
    return { status: 'blocked', failedPhase: 'P6', detail: p6 };
  }

  // ===== P7 + P8 — parallel after P6 (P7 reads config, P8 reads results; disjoint files) =====
  phase('P7 Interview loop');
  const [p7, p8] = await parallel([
    () =>
      agent(
        brief(
          'PHASE 7 — INTERVIEW SCREEN (plan lines ~568-687). THE core loop.',
          `Build src/screens/InterviewScreen.jsx + child components QuestionCard/JamieBlob/PushToTalkButton/TranscriptPreview/FeedbackPanel/SessionProgress under src/components/interview/.
- 7.1 useReducer phase machine (LOADING|SPEAKING|IDLE|LISTENING|PROCESSING|FEEDBACK|DONE), load config from sessionStorage('jamie_session_config') (the EXACT shape P6 wrote), fetch GET /api/question?mode=&category=&exclude=.
- 7.2 voice: auto POST /api/tts when voiceEnabled && user.hasElevenLabsKey, play audio/mpeg via Audio() object URL, JamieBlob 'speaking' -> onended IDLE; else straight to IDLE.
- 7.3 PushToTalkButton hold vs tap + Spacebar (preventDefault scroll, held-flag for auto-repeat); Web Speech API SpeechRecognition (interimResults, en-US); UNSUPPORTED -> textarea fallback + Submit (graceful degradation, no crash). TranscriptPreview live interim.
- 7.4 on finalize: PROCESSING -> POST /api/evaluate { question, user_answer, mode, key_points, star_hints } -> store result -> FEEDBACK.
- 7.5 FeedbackPanel IB/RX (score bar, ✓ hit / ✗ missed chips, feedback_line) vs Behavioral (STAR 0-3 star rows, score, strengths/improvements, feedback_line); voice -> auto-play feedback_line TTS w/ ✕ skip. [Next Question] -> exclude id, navigate /app/summary with location.state {results,mode,config} on last else fetch next.
- 7.6 controls Skip (NO result recorded, count unaffected — skip-erasure) / Repeat / End session. 7.7 JamieBlob 4 visual states via CSS (+ optional AnalyserNode amplitude on listening, fall back to pulse if mic denied).
Assume score 0.0–1.0. Touch ONLY InterviewScreen.jsx + the 6 interview/ components.`,
        ),
        { label: 'p7-interview', phase: 'P7 Interview loop', schema: buildSchema, model: 'sonnet' },
      ),
    () =>
      agent(
        brief(
          'PHASE 8 — SUMMARY SCREEN (plan lines ~690-737).',
          `Build src/screens/SummaryScreen.jsx: 8.1 read location.state (results,mode,config); null -> navigate('/app'). 8.2 header (Session Complete + mode + date) + overall score ring (mean*100, conic-gradient/SVG arc, color thresholds >=70 green / 40-69 amber / <40 red). 8.3 category breakdown table (IB/RX, sorted weakest-first) or STAR-dimension averages (behavioral). 8.4 weak-areas amber box (<50%). 8.5 most-missed key points top-5 with counts, collapsed toggle (IB/RX). 8.6 [Practice Again] -> /app/configure?mode=, [Change Mode] -> /app, [Export Summary] -> client-side Blob .txt download (jamie-session-{mode}-{date}.txt). 8.7 skip-erasure assert comment, empty-results graceful "No questions completed", NaN guard -> "--". Assume score 0.0–1.0. Touch ONLY SummaryScreen.jsx.`,
        ),
        { label: 'p8-summary', phase: 'P8 Summary', schema: buildSchema, model: 'sonnet' },
      ),
  ]);

  const coreBuild = { p7, p8 };
  const coreBlocked = Object.entries(coreBuild).filter(
    ([, r]) => !r.buildPassed || (r.blockers && r.blockers.length),
  );
  if (coreBlocked.length) {
    log(`HALT: core loop phase(s) blocked: ${coreBlocked.map(([k]) => k).join(', ')}.`);
    return { status: 'blocked', failedPhase: coreBlocked.map(([k]) => k).join('+'), detail: coreBuild };
  }

  // ===== P10 — RESPONSIVE + A11Y POLISH (final pass; all screens must exist) =====
  phase('P10 Responsive + a11y polish');
  const p10 = await agent(
    brief(
      'PHASE 10 — RESPONSIVE POLISH & ACCESSIBILITY (plan lines ~799-851). Final pass over ALL screens.',
      `Cross-cutting pass — you MAY edit any file under src/ but PRESERVE existing behavior (do not regress any flow):
- 10.1 responsive: auth screens single-column max-width 440px + button stacking <360px; ModeSelect grid repeat(auto-fit,minmax(220px,1fr)); Interview full-bleed mobile, PTT >=72px touch target, full-width progress; Summary table -> stacked rows on mobile.
- 10.2 a11y: every input has <label htmlFor/id>; visible focus outlines (--color-accent 2px solid 2px offset); PTT aria-label; aria-live="polite" region for transcript + phase state; confetti canvas aria-hidden; ✓/✗ glyphs accompany all color signals; score bars aria-valuenow/min/max.
- 10.3 src/components/ui/Spinner.jsx (own/reconcile the pure-CSS ring; if P2 created a minimal one, consolidate to this canonical component and update imports) + per-screen loading messages.
- 10.4 src/components/ui/ErrorBoundary.jsx + wrap major screen groups in App.jsx; shows "Something went wrong. Refresh..." + [Refresh] window.location.reload().
Run \`npm run build\` after — must stay green. Report any file you touched.`,
    ),
    { label: 'p10-polish', phase: 'P10 Responsive + a11y polish', schema: buildSchema, model: 'sonnet' },
  );
  if (!p10.buildPassed || (p10.blockers && p10.blockers.length)) {
    log('HALT: P10 polish broke the build or reported blockers.');
    return { status: 'blocked', failedPhase: 'P10', detail: p10 };
  }

  // ===== P11 — SMOKE-TEST GATE (independent verifier; does NOT build features) =====
  phase('P11 Smoke-test gate');
  const verdict = await agent(
    `You are an INDEPENDENT verifier for the jamie.ai frontend. Do NOT write feature code. Verify the build matches the plan's PHASE 11 — SMOKE TEST CHECKLIST (lifecycle/pending/plans/frontend-buildout.txt, lines ~853-936).

Steps:
1. From frontend/, run \`npm run build\` and confirm exit 0 with zero unresolved imports.
2. Statically verify the checklist items that are checkable from source (you cannot click a live UI, so audit the CODE for each):
   - Route table + ProtectedRoute/AuthRoute guards present (no infinite-redirect: 401 from /api/auth/me clears localStorage and lands on Landing).
   - Wizard: confetti on all-valid; [Fix my keys] pre-fills the passed key & clears the failed one; explicit Skip sets elevenLabsKey=null.
   - SessionConfig writes sessionStorage('jamie_session_config') with shape { mode, categories, count, voiceEnabled, inputMode }; InterviewScreen reads that EXACT shape.
   - Skip-erasure: Skip does NOT push to results and does NOT change the completed count.
   - Voice degradation BOTH levels: no ElevenLabs key hides voice; SpeechRecognition-unsupported shows textarea fallback (no crash).
   - Summary: empty results -> "--" and graceful message; export produces a Blob .txt.
   - D1: no screen renders/returns a raw API key after submission; Settings shows status only.
   - D3: package.json has ONLY react-router-dom + canvas-confetti as added runtime deps; NO tailwind/postcss/icon/date libs anywhere.
   - a11y: labels via htmlFor/id, focus outlines, aria-live region, score bars aria-valuenow, confetti aria-hidden.
3. Report per-item PASS/FAIL/UNVERIFIABLE with the file:line evidence, and an overall verdict. Flag the plan's OPEN QUESTIONS (OQ1 score range, OQ2 question-exhaustion) if the code makes an assumption that should be confirmed.

Return the structured verdict. Do not declare PASS if the build is red or any HARD invariant (D1/D3/skip-erasure/voice-degradation) fails.`,
    {
      label: 'p11-smoke-verify',
      phase: 'P11 Smoke-test gate',
      model: 'opus',
      schema: {
        type: 'object',
        required: ['buildPassed', 'overall', 'items'],
        properties: {
          buildPassed: { type: 'boolean' },
          overall: { enum: ['PASS', 'FAIL', 'PARTIAL'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['check', 'status'],
              properties: {
                check: { type: 'string' },
                status: { enum: ['PASS', 'FAIL', 'UNVERIFIABLE'] },
                evidence: { type: 'string' },
              },
            },
          },
          failures: { type: 'array', items: { type: 'string' } },
          openQuestionsToConfirm: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  );

  log(`Smoke-test verdict: ${verdict.overall} (build ${verdict.buildPassed ? 'green' : 'RED'}).`);

  return {
    status: verdict.overall === 'PASS' && verdict.buildPassed ? 'complete' : 'needs-attention',
    built: {
      scaffold: p1.summary,
      authCore: p2.summary,
      authScreens: p3.summary,
      keyWizard: p4.summary,
      modeSelect: p5.summary,
      settings: p9.summary,
      sessionConfig: p6.summary,
      interview: p7.summary,
      summary: p8.summary,
      polish: p10.summary,
    },
    verification: verdict,
    note:
      'Backend routes (POST /api/auth/{register,login,logout,password}, GET /api/auth/me, POST /api/user/keys/verify) and per-user-key decryption in /api/evaluate + /api/tts are OUT OF SCOPE for this frontend workflow (plan Phase 2.4 / BACKEND ROUTES REQUIRED). Flows depending on them cannot be live-verified until the backend exists.',
  };