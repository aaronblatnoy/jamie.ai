/**
 * SummaryScreen.jsx — Phase 8
 *
 * End-of-session review screen.
 *
 * Receives via location.state (from navigate('/app/summary', { state: ... })):
 *   {
 *     results: Array<{ question, answer, evaluation }>,
 *     mode:    'ib' | 'rx' | 'behavioral',
 *     config:  { mode, categories, count, voiceEnabled, inputMode }
 *   }
 *
 * where evaluation (IB/RX) is:
 *   { hit: string[], missed: string[], feedback_line: string, score: number }
 * and evaluation (behavioral) is:
 *   { situation: number, task: number, action: number, result: number,
 *     score: number, strengths: string[], improvements: string[],
 *     feedback_line: string }
 *
 * Score contract: score is 0.0–1.0; multiply by 100 for display.
 * OQ1: assume evaluate score is 0.0–1.0.
 *
 * SKIP-ERASURE INVARIANT: Skipped questions are never added to results[]
 * by InterviewScreen (see Phase 7 [Skip] handler). Therefore no skip
 * filtering is needed here — every entry in results[] is a completed
 * question with a real score. Do not modify this behaviour.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

/** Format today's date as YYYY-MM-DD (plain JS, no date-fns). */
function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Human-readable mode label. */
function modeLabel(mode) {
  if (mode === 'ib')         return 'Investment Banking';
  if (mode === 'rx')         return 'Restructuring (RX)';
  if (mode === 'behavioral') return 'Behavioral / STAR';
  return mode ?? 'Unknown';
}

/**
 * Overall score color threshold.
 *   >= 70 → green
 *   40–69 → amber
 *   <  40 → red
 */
function scoreColor(pct) {
  if (pct >= 70) return 'var(--color-success)';
  if (pct >= 40) return 'var(--color-warning)';
  return 'var(--color-error)';
}

/** NaN-safe mean: returns NaN if array is empty. */
function mean(arr) {
  if (!arr.length) return NaN;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/* ------------------------------------------------------------------
   Score Ring (CSS conic-gradient)
------------------------------------------------------------------ */
function ScoreRing({ pct }) {
  // pct is 0–100 or NaN
  const isNaN_ = Number.isNaN(pct);
  const color  = isNaN_ ? 'var(--color-text-muted)' : scoreColor(pct);
  const filled = isNaN_ ? 0 : Math.min(100, Math.max(0, pct));
  const label  = isNaN_ ? '--' : `${Math.round(pct)}%`;

  const ringStyle = {
    width: 140,
    height: 140,
    borderRadius: '50%',
    background: isNaN_
      ? 'var(--color-border)'
      : `conic-gradient(${color} ${filled}%, var(--color-border) 0%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  };

  const holeStyle = {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'var(--color-surface)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={ringStyle}>
      <div style={holeStyle}>
        <span style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1 }}>
          {label}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
          overall
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   IB / RX category breakdown
------------------------------------------------------------------ */
function CategoryBreakdown({ results }) {
  // Group by question.category
  const map = {};
  for (const r of results) {
    const cat = r.question?.category ?? 'Unknown';
    if (!map[cat]) map[cat] = { scores: [], missedCounts: 0 };
    map[cat].scores.push((r.evaluation?.score ?? 0) * 100);
    map[cat].missedCounts += (r.evaluation?.missed ?? []).length;
  }

  const rows = Object.entries(map).map(([cat, d]) => ({
    cat,
    count:   d.scores.length,
    avg:     mean(d.scores),
    missed:  d.missedCounts,
  }));

  // Sort by avg ascending (weakest first); NaN sorts last
  rows.sort((a, b) => {
    if (Number.isNaN(a.avg)) return 1;
    if (Number.isNaN(b.avg)) return -1;
    return a.avg - b.avg;
  });

  if (!rows.length) return null;

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--color-text-primary)' }}>
        Category Breakdown
      </h3>
      {/* Desktop: table view */}
      <div className="catbreak-table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ color: 'var(--color-text-muted)', textAlign: 'left' }}>
              <th style={thStyle}>Category</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Questions</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Avg Score</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Missed Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ cat, count, avg, missed }) => {
              const pct = Number.isNaN(avg) ? null : avg;
              return (
                <tr key={cat} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={tdStyle}>{cat}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{count}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {pct == null ? '--' : (
                      <span style={{ color: scoreColor(pct), fontWeight: 600 }}>
                        {Math.round(pct)}%
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {missed}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked rows */}
      <div className="catbreak-stacked">
        {rows.map(({ cat, count, avg, missed }) => {
          const pct = Number.isNaN(avg) ? null : avg;
          return (
            <div key={cat} className="catbreak-stacked-row">
              <div className="catbreak-stacked-cat">{cat}</div>
              <div className="catbreak-stacked-meta">
                <span>
                  {count} question{count !== 1 ? 's' : ''}
                </span>
                <span>
                  Score:{' '}
                  {pct == null ? '--' : (
                    <strong style={{ color: scoreColor(pct) }}>{Math.round(pct)}%</strong>
                  )}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {missed} missed point{missed !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .catbreak-table-wrap {
          overflow-x: auto;
        }

        .catbreak-stacked {
          display: none;
        }

        @media (max-width: 540px) {
          .catbreak-table-wrap {
            display: none;
          }

          .catbreak-stacked {
            display: flex;
            flex-direction: column;
            gap: 0;
          }

          .catbreak-stacked-row {
            padding: 0.75rem 0;
            border-top: 1px solid var(--color-border);
          }

          .catbreak-stacked-row:first-child {
            border-top: none;
          }

          .catbreak-stacked-cat {
            font-size: 0.9375rem;
            font-weight: 600;
            color: var(--color-text-primary);
            margin-bottom: 0.25rem;
          }

          .catbreak-stacked-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem 1rem;
            font-size: 0.8125rem;
            color: var(--color-text-secondary);
          }
        }
      `}</style>
    </div>
  );
}

const thStyle = {
  padding: '0.5rem 0.75rem',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const tdStyle = {
  padding: '0.625rem 0.75rem',
  verticalAlign: 'middle',
};

/* ------------------------------------------------------------------
   STAR dimension breakdown (behavioral)
------------------------------------------------------------------ */
function StarBreakdown({ results }) {
  const dims = ['situation', 'task', 'action', 'result'];
  const dimLabel = { situation: 'Situation', task: 'Task', action: 'Action', result: 'Result' };

  const averages = dims.map(dim => {
    const vals = results
      .map(r => r.evaluation?.[dim])
      .filter(v => typeof v === 'number');
    return { dim, avg: mean(vals) };
  });

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--color-text-primary)' }}>
        STAR Dimension Averages
      </h3>
      {averages.map(({ dim, avg }) => {
        // STAR scores are 0–3; convert to 0–100% for bar and colour
        const isNaN_ = Number.isNaN(avg);
        const pct = isNaN_ ? 0 : (avg / 3) * 100;
        const color = isNaN_ ? 'var(--color-text-muted)' : scoreColor(pct);
        return (
          <div key={dim} style={{ marginBottom: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                {dimLabel[dim]}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color }}>
                {isNaN_ ? '--' : `${avg.toFixed(1)} / 3`}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={isNaN_ ? 0 : Math.round(avg * 10) / 10}
              aria-valuemin={0}
              aria-valuemax={3}
              aria-label={`${dimLabel[dim]}: ${isNaN_ ? 'no data' : `${avg.toFixed(1)} out of 3`}`}
              style={{
                height: 8,
                borderRadius: 4,
                background: 'var(--color-border)',
                overflow: 'hidden',
              }}
            >
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: color,
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------
   Weak areas callout (IB/RX only, categories with avg < 50%)
------------------------------------------------------------------ */
function WeakAreas({ results }) {
  const map = {};
  for (const r of results) {
    const cat = r.question?.category ?? 'Unknown';
    if (!map[cat]) map[cat] = [];
    map[cat].push((r.evaluation?.score ?? 0) * 100);
  }

  const weak = Object.entries(map)
    .map(([cat, scores]) => ({ cat, avg: mean(scores) }))
    .filter(({ avg }) => !Number.isNaN(avg) && avg < 50)
    .sort((a, b) => a.avg - b.avg);

  if (!weak.length) return null;

  return (
    <div style={{
      background: 'rgba(217, 119, 6, 0.1)',
      border: '1px solid var(--color-warning)',
      borderRadius: 'var(--radius)',
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem',
    }}>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: 'var(--color-warning)', fontSize: '0.9rem' }}>
        Focus here next time:
      </p>
      <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
        {weak.map(({ cat, avg }) => (
          <li key={cat} style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', marginBottom: '0.2rem' }}>
            {cat} ({Math.round(avg)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------
   Most-missed key points (IB/RX), top 5 with count badges
------------------------------------------------------------------ */
function MostMissed({ results }) {
  const [open, setOpen] = useState(false);

  // Frequency-count all missed[] strings across all results
  const freq = {};
  for (const r of results) {
    for (const kp of (r.evaluation?.missed ?? [])) {
      freq[kp] = (freq[kp] ?? 0) + 1;
    }
  }

  const top5 = Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (!top5.length) return null;

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <button
        className="btn-ghost"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', justifyContent: 'space-between', padding: '0', background: 'none', border: 'none' }}
        aria-expanded={open}
      >
        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          See missed key points
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <ul style={{ margin: '1rem 0 0', paddingLeft: 0, listStyle: 'none' }}>
          {top5.map(([kp, count]) => (
            <li key={kp} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.5rem 0',
              borderTop: '1px solid var(--color-border)',
            }}>
              <span style={{
                background: 'rgba(229, 62, 62, 0.15)',
                color: 'var(--color-error)',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.125rem 0.5rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                ×{count}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {kp}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Export helper (client-side Blob .txt download)
------------------------------------------------------------------ */
function buildExportText({ results, mode, config, date }) {
  const lines = [];
  lines.push(`Jamie.ai Session Summary`);
  lines.push(`========================`);
  lines.push(`Mode:  ${modeLabel(mode)}`);
  lines.push(`Date:  ${date}`);
  lines.push(`Questions completed: ${results.length}`);
  lines.push('');

  const scores = results.map(r => (r.evaluation?.score ?? 0) * 100);
  const avg    = mean(scores);
  lines.push(`Overall Score: ${Number.isNaN(avg) ? '--' : Math.round(avg) + '%'}`);
  lines.push('');
  lines.push('--------');

  results.forEach((r, i) => {
    lines.push('');
    lines.push(`Question ${i + 1}: ${r.question?.question ?? '(unknown)'}`);
    lines.push(`Answer:   ${r.answer ?? '(none)'}`);
    const ev = r.evaluation ?? {};
    lines.push(`Score:    ${typeof ev.score === 'number' ? Math.round(ev.score * 100) + '%' : '--'}`);
    if (Array.isArray(ev.hit)    && ev.hit.length)    lines.push(`Hit:      ${ev.hit.join('; ')}`);
    if (Array.isArray(ev.missed) && ev.missed.length) lines.push(`Missed:   ${ev.missed.join('; ')}`);
    if (ev.feedback_line) lines.push(`Feedback: ${ev.feedback_line}`);
    lines.push('--------');
  });

  return lines.join('\n');
}

function downloadExport({ results, mode, config, date }) {
  const text = buildExportText({ results, mode, config, date });
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `jamie-session-${mode}-${date}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------
   Main SummaryScreen
------------------------------------------------------------------ */
export default function SummaryScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  // 8.1 — If location.state is null (direct navigation), redirect to /app
  const state = location.state;
  if (!state) {
    // Use effect-free redirect pattern: render during commit phase is fine
    // because we render null after the navigate call never commits a full tree.
    return <RedirectToApp navigate={navigate} />;
  }

  const { results = [], mode = '', config = {} } = state;
  const date = todayString();
  const isBehavioral = mode === 'behavioral';

  // Overall score: NaN-safe mean of result scores (score is 0.0–1.0, ×100 for %)
  const scores   = results.map(r => (r.evaluation?.score ?? 0) * 100);
  const overallPct = mean(scores); // NaN if empty

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ---- 8.2 Header ---- */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 700 }}>
            Session Complete
          </h1>
          <p style={{ margin: '0 0 0.25rem', color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
            {modeLabel(mode)}
          </p>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {date}
          </p>
        </div>

        {/* ---- 8.2 Score Ring ---- */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <ScoreRing pct={overallPct} />
        </div>

        {/* ---- 8.7 Empty results guard ---- */}
        {results.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            No questions completed
          </div>
        ) : (
          <>
            {/* ---- 8.3 Category breakdown (IB/RX) or STAR breakdown (behavioral) ---- */}
            {isBehavioral ? (
              <StarBreakdown results={results} />
            ) : (
              <CategoryBreakdown results={results} />
            )}

            {/* ---- 8.4 Weak areas callout (IB/RX only) ---- */}
            {!isBehavioral && <WeakAreas results={results} />}

            {/* ---- 8.5 Most-missed key points (IB/RX only), collapsed toggle ---- */}
            {!isBehavioral && <MostMissed results={results} />}
          </>
        )}

        <hr className="divider" />

        {/* ---- 8.6 Action buttons ---- */}
        <div className="auth-cta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            className="btn-primary"
            onClick={() => navigate(`/app/configure?mode=${encodeURIComponent(mode)}`)}
          >
            Practice Again
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate('/app')}
          >
            Change Mode
          </button>
          <button
            className="btn-ghost"
            onClick={() => downloadExport({ results, mode, config, date })}
          >
            Export Summary
          </button>
        </div>

      </div>
    </div>
  );
}

/**
 * Helper component to perform a redirect cleanly when location.state is null.
 * Rendering a Navigate inside a conditional is fine in React Router v6.
 */
function RedirectToApp({ navigate }) {
  React.useEffect(() => {
    navigate('/app', { replace: true });
  }, [navigate]);
  return null;
}
