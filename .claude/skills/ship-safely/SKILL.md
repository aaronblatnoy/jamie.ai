---
name: ship-safely
description: This skill should be used EVERY TIME before committing and pushing a change to jamie.ai (frontend or backend). It is the pre-push gate that prevents shipping broken code to Railway. Use it whenever you are about to `git push`, deploy, or tell the user a change is live. Triggers — "push this", "deploy", "ship it", "make it live", or any edit to frontend/ or backend/ that will be pushed.
version: 1.0.0
---

# Ship Safely — jamie.ai pre-push gate

jamie.ai auto-deploys to Railway on every push to `main`. There is no PR/CI
gate. So **a bad push goes straight to the live app the user is testing.** This
skill is the checklist that catches breakage *before* it ships.

## Why this exists (real failures that motivated it)

1. **Question text grabbed from the wrong field** — `res.data.question ?? res.data`
   pulled the question *string* instead of the object; the card showed "Loading
   question..." forever. `vite build` passed clean — it was a logic bug.
2. **Temporal-dead-zone crash** — a `useCallback` referenced another `useCallback`
   in its dependency array *before that one was defined*. `vite build` passed
   clean (TDZ is a runtime error). The whole app rendered the ErrorBoundary
   ("Something went wrong. Refresh the page to continue.").
3. **Missing build context** — the `questions/` dir was gitignored and never
   copied into the Docker image; Railway had no question bank at all.

The throughline: **`vite build` only checks syntax. It does NOT catch logic
bugs, TDZ/use-before-define, hook-order violations, or missing runtime files.**
You need more than a build.

## The gate — run ALL of these before `git push`

Run from the relevant package dir (`frontend/` or `backend/`).

### 1. Build (syntax / imports)
```bash
cd frontend && npm run build
```
Must end with `✓ built`. Fix any error before continuing.

### 2. Crash-class lint (the step build can't do)
```bash
cd frontend && npm run lint:crash
```
This runs ESLint scoped to **crash-causing** rules only (`.eslintrc.cjs`):
`no-use-before-define`, `no-undef`, `react/jsx-no-undef`,
`react-hooks/rules-of-hooks`.

- **Lint the files you changed and confirm they introduce NO new errors.**
  `npm run lint:crash` exits non-zero on pre-existing findings in files you did
  not touch (e.g. `SessionConfig.jsx` hook-order, `SummaryScreen.jsx` style
  forward-refs). Those are a separate, pre-existing backlog — do **not** fix them
  reflexively as part of an unrelated change. The gate is: *your diff adds no new
  crash-class error.* Check by linting just your changed files:
  ```bash
  npx eslint src/screens/InterviewScreen.jsx --quiet   # example: your changed file
  ```
  It must exit 0.
- If you genuinely need a safe forward-reference (e.g. calling a `useCallback`
  inside an effect *body*, which runs post-render — not in a deps array), add a
  targeted `// eslint-disable-next-line no-use-before-define` with a one-line
  comment explaining why it's safe. Never blanket-disable.

### 3. Trace the data contract (the logic-bug catch)
Build + lint both pass clean on logic bugs like failure #1. So **manually verify
the shape of any data you read across the front/back boundary.** Backend returns
the question object **flat**: `{ id, question, key_points, category, difficulty }`
— NOT wrapped in `{ question: {...} }`. When you touch an API response, confirm
the real shape:
```bash
# hit the live (or local) endpoint and look at the actual JSON
curl -s "https://jamieai-production.up.railway.app/api/question?mode=ib" \
  -H "Authorization: Bearer <token>" | python3 -m json.tool
```
Match your destructuring to what the server actually sends.

### 4. Backend changes — exercise the code path
If you touched `backend/`, run the affected module directly before pushing:
```bash
cd backend && node -e "import('./src/lib/questions-store.js').then(async m => {
  console.log(await m.listCategories('ib'));
})"
```
And confirm any new runtime file is actually included in the Docker image
(`Dockerfile` COPYs `backend/` and `frontend/dist` — files outside those, or
gitignored, will NOT reach Railway).

### 5. Commit + push
Only after 1–4 pass. Use a message that states the bug and the fix.

## Post-push verification (don't declare "it's live and working" until you check)

Railway takes ~2–3 min to rebuild. After it deploys:

1. **Health + endpoint check** (no browser needed):
   ```bash
   curl -s https://jamieai-production.up.railway.app/api/health   # {"ok":true}
   ```
2. **Real render check** — the ErrorBoundary crash (failure #2) returns HTTP 200
   with valid HTML; only the *rendered* app shows "Something went wrong." So a
   curl of `/` is NOT enough. Use the **safari-driver agent** to load the live
   page and confirm the app actually renders (and instrument `window.fetch` /
   Resource Timing to see which API calls fire and their status). This is how
   failure #2 was diagnosed — observe the real browser, don't theorize.
3. Tell the user to **hard-refresh (Cmd+Shift+R)** to drop the old cached bundle.

## Rules of thumb

- **Observe before theorizing.** When something is "slow" or "broken," instrument
  the real browser (safari-driver + fetch timing + console) before guessing at
  cold starts, caching, etc. The actual cause is usually a concrete error in the
  network log or console.
- **`vite build` passing ≠ safe.** It never catches TDZ, hook-order, logic, or
  missing-file bugs. Always also run `lint:crash` and trace the data contract.
- **One change, verify, push.** Don't stack several speculative fixes into one
  push — if it breaks, you won't know which one did it.
