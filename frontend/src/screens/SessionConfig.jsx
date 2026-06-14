/**
 * SessionConfig.jsx — Phase 6
 *
 * Session configuration screen. Reads mode from URL search param,
 * lets the user select categories, question count, voice, and input mode,
 * then stores the session config in sessionStorage and navigates to the
 * interview screen.
 *
 * sessionStorage key: 'jamie_session_config'
 * Config shape (contract for Phase 7 InterviewScreen):
 *   {
 *     mode: 'ib' | 'rx' | 'behavioral',
 *     categories: string[],   // slug strings
 *     count: number,          // 5 | 10 | 20
 *     voiceEnabled: boolean,
 *     inputMode: 'hold' | 'tap',
 *   }
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

/* ------------------------------------------------------------------ */
/* IB category / slug definitions                                      */
/* ------------------------------------------------------------------ */

/**
 * Each IB parent category has a Basic and Advanced slug.
 * Brain Teasers is a single toggle (no basic/advanced split).
 */
const IB_CATEGORIES = [
  { label: 'Accounting',                basicSlug: 'accounting-basic',              advancedSlug: 'accounting-advanced' },
  { label: 'Enterprise / Equity Value', basicSlug: 'enterprise-equity-value-basic', advancedSlug: 'enterprise-equity-value-advanced' },
  { label: 'Valuation',                 basicSlug: 'valuation-basic',               advancedSlug: 'valuation-advanced' },
  { label: 'DCF',                       basicSlug: 'dcf-basic',                     advancedSlug: 'dcf-advanced' },
  { label: 'M&A',                       basicSlug: 'ma-basic',                      advancedSlug: 'ma-advanced' },
  { label: 'LBO',                       basicSlug: 'lbo-basic',                     advancedSlug: 'lbo-advanced' },
];

const BRAIN_TEASERS_SLUG = 'brain-teasers';

/**
 * All IB slugs (for Select All).
 */
const ALL_IB_SLUGS = [
  ...IB_CATEGORIES.flatMap(c => [c.basicSlug, c.advancedSlug]),
  BRAIN_TEASERS_SLUG,
];

/* ------------------------------------------------------------------ */
/* RX categories                                                       */
/* ------------------------------------------------------------------ */

/**
 * Each RX parent category has a Basic and Advanced slug.
 * Slugs are paths (e.g. "basic/overview") that map directly to
 * questions/rx/basic/overview/questions.json on the backend.
 */
const RX_CATEGORIES = [
  { label: 'Overview',            basicSlug: 'basic/overview',            advancedSlug: 'advanced/overview' },
  { label: 'Capital Structure',   basicSlug: 'basic/capital-structure',   advancedSlug: 'advanced/capital-structure' },
  { label: 'Accounting',          basicSlug: 'basic/accounting',          advancedSlug: 'advanced/accounting' },
  { label: 'Bond Math',           basicSlug: 'basic/bond-math',           advancedSlug: 'advanced/bond-math' },
  { label: 'Credit Analysis',     basicSlug: 'basic/credit-analysis',     advancedSlug: 'advanced/credit-analysis' },
  { label: 'Chapter 11',          basicSlug: 'basic/chapter-11',          advancedSlug: 'advanced/chapter-11' },
  { label: 'Out-of-Court',        basicSlug: 'basic/out-of-court',        advancedSlug: 'advanced/out-of-court' },
  { label: 'Recovery',            basicSlug: 'basic/recovery',            advancedSlug: 'advanced/recovery' },
  { label: 'Distressed Investing',basicSlug: 'basic/distressed-investing',advancedSlug: 'advanced/distressed-investing' },
];

/**
 * All RX slugs (for Select All).
 */
const ALL_RX_SLUGS = RX_CATEGORIES.flatMap(c => [c.basicSlug, c.advancedSlug]);

/* ------------------------------------------------------------------ */
/* Behavioral categories                                               */
/* ------------------------------------------------------------------ */

const BEHAVIORAL_CATEGORIES = [
  { label: 'All',                    slug: 'behavioral-all' },
  { label: 'Leadership',             slug: 'behavioral-leadership' },
  { label: 'Teamwork',               slug: 'behavioral-teamwork' },
  { label: 'Conflict',               slug: 'behavioral-conflict' },
  { label: 'Why Banking',            slug: 'behavioral-why-banking' },
  { label: 'Strengths & Weaknesses', slug: 'behavioral-strengths-weaknesses' },
  { label: 'Achievement',            slug: 'behavioral-achievement' },
  { label: 'Failure',                slug: 'behavioral-failure' },
];

/* ------------------------------------------------------------------ */
/* Count options                                                       */
/* ------------------------------------------------------------------ */

const COUNT_OPTIONS = [5, 10, 20];

/* ------------------------------------------------------------------ */
/* Mode display names                                                  */
/* ------------------------------------------------------------------ */

const MODE_NAMES = {
  ib:         'Investment Banking',
  rx:         'Restructuring',
  behavioral: 'Behavioral',
};

/* ================================================================== */
/* Component                                                           */
/* ================================================================== */

export default function SessionConfig() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // 6.1 — validate mode param
  const mode = searchParams.get('mode');
  const validModes = ['ib', 'rx', 'behavioral'];
  if (!validModes.includes(mode)) {
    // Redirect away immediately; this is a render-time redirect.
    // We use a state-less early return since hooks are already called.
    navigate('/app', { replace: true });
    return null;
  }

  const modeName = MODE_NAMES[mode];

  // ----------------------------------------------------------------
  // State
  // ----------------------------------------------------------------

  // IB: track which slugs are selected (a Set of slug strings).
  // Initial default: all basic slugs selected.
  const initialIbSlugs = useMemo(
    () => new Set(IB_CATEGORIES.map(c => c.basicSlug)),
    []
  );

  const [ibSelectedSlugs, setIbSelectedSlugs] = useState(initialIbSlugs);
  const [brainTeasers, setBrainTeasers]       = useState(false);

  // RX: track which slugs are selected (a Set of slug strings).
  // Initial default: all basic slugs selected.
  const initialRxSlugs = useMemo(
    () => new Set(RX_CATEGORIES.map(c => c.basicSlug)),
    []
  );

  const [rxSelectedSlugs, setRxSelectedSlugs] = useState(initialRxSlugs);

  // Behavioral: multi-select chip group; default 'All'
  const [behavioralSelected, setBehavioralSelected] = useState(
    new Set(['behavioral-all'])
  );

  // Question count
  const [count, setCount] = useState(10);

  // Voice toggle (only relevant if user has ElevenLabs key)
  const [voiceEnabled, setVoiceEnabled] = useState(
    user?.hasElevenLabsKey ? true : false
  );

  // Input mode
  const [inputMode, setInputMode] = useState('hold');

  // Validation error
  const [error, setError] = useState('');

  // ----------------------------------------------------------------
  // RX slug helpers
  // ----------------------------------------------------------------

  function toggleRxSlug(slug) {
    setRxSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function handleRxSelectAll() {
    const allSelected = ALL_RX_SLUGS.every(s => rxSelectedSlugs.has(s));
    if (allSelected) {
      setRxSelectedSlugs(new Set());
    } else {
      setRxSelectedSlugs(new Set(ALL_RX_SLUGS));
    }
  }

  const rxAllSelected = ALL_RX_SLUGS.every(s => rxSelectedSlugs.has(s));

  /**
   * Difficulty hint for RX:
   *   Only basic/ slugs selected → "Basic level selected"
   *   Only advanced/ slugs selected → "Advanced level selected"
   *   Mixed → no label
   */
  const rxDifficultyHint = useMemo(() => {
    const selected = [...rxSelectedSlugs];
    if (selected.length === 0) return null;
    const onlyBasic    = selected.every(s => s.startsWith('basic/'));
    const onlyAdvanced = selected.every(s => s.startsWith('advanced/'));
    if (onlyBasic)    return 'Basic level selected';
    if (onlyAdvanced) return 'Advanced level selected';
    return null;
  }, [rxSelectedSlugs]);

  // ----------------------------------------------------------------
  // IB slug helpers
  // ----------------------------------------------------------------

  function toggleIbSlug(slug) {
    setIbSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function handleIbSelectAll() {
    // If everything is already selected, deselect all; otherwise select all.
    const allSelected = ALL_IB_SLUGS.every(
      s => s === BRAIN_TEASERS_SLUG ? brainTeasers : ibSelectedSlugs.has(s)
    );
    if (allSelected) {
      setIbSelectedSlugs(new Set());
      setBrainTeasers(false);
    } else {
      setIbSelectedSlugs(new Set(IB_CATEGORIES.flatMap(c => [c.basicSlug, c.advancedSlug])));
      setBrainTeasers(true);
    }
  }

  /**
   * Difficulty hint for IB:
   *   Only -basic slugs selected → "Basic level selected"
   *   Only -advanced slugs selected → "Advanced level selected"
   *   Mixed → no label
   */
  const ibDifficultyHint = useMemo(() => {
    const selected = [...ibSelectedSlugs];
    if (selected.length === 0) return null;
    const onlyBasic    = selected.every(s => s.endsWith('-basic'));
    const onlyAdvanced = selected.every(s => s.endsWith('-advanced'));
    if (onlyBasic)    return 'Basic level selected';
    if (onlyAdvanced) return 'Advanced level selected';
    return null;
  }, [ibSelectedSlugs]);

  // ----------------------------------------------------------------
  // Behavioral helpers
  // ----------------------------------------------------------------

  function toggleBehavioral(slug) {
    setBehavioralSelected(prev => {
      const next = new Set(prev);
      if (slug === 'behavioral-all') {
        // Toggle All: if already on, turn off; else select only All
        if (next.has('behavioral-all')) {
          next.delete('behavioral-all');
        } else {
          next.clear();
          next.add('behavioral-all');
        }
      } else {
        // Toggling a specific category removes 'All'
        next.delete('behavioral-all');
        if (next.has(slug)) {
          next.delete(slug);
        } else {
          next.add(slug);
        }
      }
      return next;
    });
  }

  // ----------------------------------------------------------------
  // Derive the final categories slug array for sessionStorage
  // ----------------------------------------------------------------

  function buildCategories() {
    if (mode === 'ib') {
      const slugs = [...ibSelectedSlugs];
      if (brainTeasers) slugs.push(BRAIN_TEASERS_SLUG);
      return slugs;
    }
    if (mode === 'rx') {
      return [...rxSelectedSlugs];
    }
    if (mode === 'behavioral') {
      return [...behavioralSelected];
    }
    return [];
  }

  // ----------------------------------------------------------------
  // Submit (6.7)
  // ----------------------------------------------------------------

  function handleStart() {
    const categories = buildCategories();
    if (categories.length === 0) {
      setError('Please select at least one category.');
      return;
    }
    setError('');

    const config = {
      mode,
      categories,
      count,
      voiceEnabled: user?.hasElevenLabsKey ? voiceEnabled : false,
      inputMode,
    };

    sessionStorage.setItem('jamie_session_config', JSON.stringify(config));
    navigate('/app/interview');
  }

  // ----------------------------------------------------------------
  // IB: is everything selected?
  // ----------------------------------------------------------------
  const ibAllSelected = ALL_IB_SLUGS.every(
    s => s === BRAIN_TEASERS_SLUG ? brainTeasers : ibSelectedSlugs.has(s)
  );

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  return (
    <div className="session-config-page">
      {/* 6.2 — Header */}
      <header className="session-config-header">
        <div className="session-config-header-inner">
          <span className="session-config-wordmark">
            <span style={{ color: 'var(--color-text-primary)' }}>jamie</span>
            <span style={{ color: 'var(--color-accent)' }}>.ai</span>
          </span>
          <button
            className="btn-ghost session-config-back"
            onClick={() => navigate('/app')}
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Main card */}
      <main className="session-config-main">
        <div className="card session-config-card">
          <h1 className="session-config-title">{modeName}</h1>
          <p className="session-config-subtitle">Configure your session</p>

          <hr className="divider" />

          {/* ---- 6.3 Category selection ---- */}
          <section className="config-section">
            <h2 className="config-section-heading">Categories</h2>

            {mode === 'ib' && (
              <div>
                {/* Select All shortcut */}
                <div className="ib-select-all-row">
                  <button
                    className={`chip ${ibAllSelected ? 'chip--active' : ''}`}
                    onClick={handleIbSelectAll}
                    aria-pressed={ibAllSelected}
                  >
                    {ibAllSelected ? '✓ All Selected' : 'Select All'}
                  </button>
                  {ibDifficultyHint && (
                    <span className="ib-difficulty-hint">{ibDifficultyHint}</span>
                  )}
                </div>

                {/* Per-parent category rows with Basic / Advanced sub-toggles */}
                <div className="ib-category-grid">
                  {IB_CATEGORIES.map(cat => (
                    <div key={cat.label} className="ib-category-row">
                      <span className="ib-category-label">{cat.label}</span>
                      <div className="ib-sub-toggles">
                        <button
                          className={`chip ${ibSelectedSlugs.has(cat.basicSlug) ? 'chip--active' : ''}`}
                          onClick={() => toggleIbSlug(cat.basicSlug)}
                          aria-pressed={ibSelectedSlugs.has(cat.basicSlug)}
                        >
                          Basic
                        </button>
                        <button
                          className={`chip ${ibSelectedSlugs.has(cat.advancedSlug) ? 'chip--active' : ''}`}
                          onClick={() => toggleIbSlug(cat.advancedSlug)}
                          aria-pressed={ibSelectedSlugs.has(cat.advancedSlug)}
                        >
                          Advanced
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Brain Teasers — single toggle */}
                  <div className="ib-category-row">
                    <span className="ib-category-label">Brain Teasers</span>
                    <div className="ib-sub-toggles">
                      <button
                        className={`chip ${brainTeasers ? 'chip--active' : ''}`}
                        onClick={() => setBrainTeasers(prev => !prev)}
                        aria-pressed={brainTeasers}
                      >
                        Include
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode === 'rx' && (
              <div>
                {/* Select All shortcut */}
                <div className="ib-select-all-row">
                  <button
                    className={`chip ${rxAllSelected ? 'chip--active' : ''}`}
                    onClick={handleRxSelectAll}
                    aria-pressed={rxAllSelected}
                  >
                    {rxAllSelected ? '✓ All Selected' : 'Select All'}
                  </button>
                  {rxDifficultyHint && (
                    <span className="ib-difficulty-hint">{rxDifficultyHint}</span>
                  )}
                </div>

                {/* Per-parent category rows with Basic / Advanced sub-toggles */}
                <div className="ib-category-grid">
                  {RX_CATEGORIES.map(cat => (
                    <div key={cat.label} className="ib-category-row">
                      <span className="ib-category-label">{cat.label}</span>
                      <div className="ib-sub-toggles">
                        <button
                          className={`chip ${rxSelectedSlugs.has(cat.basicSlug) ? 'chip--active' : ''}`}
                          onClick={() => toggleRxSlug(cat.basicSlug)}
                          aria-pressed={rxSelectedSlugs.has(cat.basicSlug)}
                        >
                          Basic
                        </button>
                        <button
                          className={`chip ${rxSelectedSlugs.has(cat.advancedSlug) ? 'chip--active' : ''}`}
                          onClick={() => toggleRxSlug(cat.advancedSlug)}
                          aria-pressed={rxSelectedSlugs.has(cat.advancedSlug)}
                        >
                          Advanced
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === 'behavioral' && (
              <div className="chip-group">
                {BEHAVIORAL_CATEGORIES.map(cat => (
                  <button
                    key={cat.slug}
                    className={`chip ${behavioralSelected.has(cat.slug) ? 'chip--active' : ''}`}
                    onClick={() => toggleBehavioral(cat.slug)}
                    aria-pressed={behavioralSelected.has(cat.slug)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          <hr className="divider" />

          {/* ---- Question count ---- */}
          <section className="config-section">
            <h2 className="config-section-heading">Number of Questions</h2>
            <div className="chip-group">
              {COUNT_OPTIONS.map(n => (
                <button
                  key={n}
                  className={`chip ${count === n ? 'chip--active' : ''}`}
                  onClick={() => setCount(n)}
                  aria-pressed={count === n}
                >
                  {n}
                </button>
              ))}
            </div>
          </section>

          <hr className="divider" />

          {/* ---- 6.4 Voice toggle ---- */}
          <section className="config-section">
            <h2 className="config-section-heading">Voice</h2>
            {user?.hasElevenLabsKey ? (
              <label className="toggle-row">
                <span className="toggle-label">Jamie speaks questions out loud</span>
                <button
                  role="switch"
                  aria-checked={voiceEnabled}
                  className={`toggle-btn ${voiceEnabled ? 'toggle-btn--on' : ''}`}
                  onClick={() => setVoiceEnabled(prev => !prev)}
                >
                  <span className="toggle-thumb" />
                </button>
              </label>
            ) : (
              <p className="config-muted-note">
                Voice off — add your ElevenLabs key in{' '}
                <Link to="/settings" className="link">Settings</Link>{' '}
                to enable Jamie's voice.
              </p>
            )}
          </section>

          <hr className="divider" />

          {/* ---- 6.5 Input mode ---- */}
          <section className="config-section">
            <h2 className="config-section-heading">Answer Mode</h2>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="inputMode"
                  value="hold"
                  checked={inputMode === 'hold'}
                  onChange={() => setInputMode('hold')}
                />
                <span>
                  <strong>Hold to speak</strong>
                  <span className="radio-desc"> — hold the button or Space to record</span>
                </span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="inputMode"
                  value="tap"
                  checked={inputMode === 'tap'}
                  onChange={() => setInputMode('tap')}
                />
                <span>
                  <strong>Tap to toggle</strong>
                  <span className="radio-desc"> — click or tap Space to start/stop</span>
                </span>
              </label>
            </div>
          </section>

          <hr className="divider" />

          {/* ---- 6.6 Feedback style ---- */}
          <section className="config-section">
            <h2 className="config-section-heading">Feedback Style</h2>
            <div className="feedback-style-row">
              <span className="feedback-style-on">Feedback after each question</span>
              <span className="config-note">Batch feedback mode: coming soon.</span>
            </div>
          </section>

          <hr className="divider" />

          {/* ---- Validation error ---- */}
          {error && <p className="error-text session-config-error">{error}</p>}

          {/* ---- 6.7 Start Session ---- */}
          <button
            className="btn-primary session-config-start"
            onClick={handleStart}
          >
            Start Session
          </button>

          {/* ---- 6.8 Back ---- */}
          <button
            className="btn-ghost session-config-back-bottom"
            onClick={() => navigate('/app')}
          >
            ← Back
          </button>
        </div>
      </main>

      {/* ---- Inline styles (scoped to this screen) ---- */}
      <style>{`
        .session-config-page {
          min-height: 100vh;
          background-color: var(--color-bg);
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .session-config-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--color-border);
          background-color: var(--color-surface);
        }

        .session-config-header-inner {
          max-width: 680px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .session-config-wordmark {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: normal;
          letter-spacing: -0.01em;
        }

        /* Main */
        .session-config-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1rem;
        }

        .session-config-card {
          width: 100%;
          max-width: 640px;
        }

        .session-config-title {
          margin: 0 0 0.25rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .session-config-subtitle {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
        }

        /* Config sections */
        .config-section {
          margin-bottom: 0.25rem;
        }

        .config-section-heading {
          margin: 0 0 0.75rem 0;
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }

        /* Chips */
        .chip-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.875rem;
          border-radius: 999px;
          border: 1.5px solid var(--color-border);
          background-color: var(--color-surface-2);
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          font-family: var(--font-serif);
          font-weight: 500;
          cursor: pointer;
          transition: border-color var(--transition), background-color var(--transition),
                      color var(--transition);
          white-space: nowrap;
        }

        .chip:hover:not(:disabled) {
          border-color: var(--color-accent);
          color: var(--color-text-primary);
        }

        .chip--active {
          border-color: var(--color-accent);
          background-color: rgba(45, 106, 79, 0.12);
          color: var(--color-accent);
        }

        .chip:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        .chip:disabled {
          opacity: 0.6;
          cursor: default;
        }

        /* IB category grid */
        .ib-select-all-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ib-difficulty-hint {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          font-style: italic;
        }

        .ib-category-grid {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .ib-category-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .ib-category-label {
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          min-width: 180px;
        }

        .ib-sub-toggles {
          display: flex;
          gap: 0.5rem;
        }

        /* RX note */
        .config-note {
          margin: 0.5rem 0 0;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }

        .config-muted-note {
          margin: 0;
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
        }

        /* Voice toggle */
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          cursor: pointer;
        }

        .toggle-label {
          font-size: 0.9375rem;
          color: var(--color-text-primary);
        }

        .toggle-btn {
          position: relative;
          width: 44px;
          height: 24px;
          border-radius: 12px;
          background-color: var(--color-border);
          border: none;
          cursor: pointer;
          padding: 0;
          transition: background-color var(--transition);
          flex-shrink: 0;
        }

        .toggle-btn--on {
          background-color: var(--color-accent);
        }

        .toggle-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        .toggle-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background-color: #fff;
          transition: transform var(--transition);
        }

        .toggle-btn--on .toggle-thumb {
          transform: translateX(20px);
        }

        /* Radio group */
        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          cursor: pointer;
          font-size: 0.9375rem;
          color: var(--color-text-primary);
        }

        .radio-option input[type="radio"] {
          accent-color: var(--color-accent);
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .radio-desc {
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }

        /* Feedback style */
        .feedback-style-row {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .feedback-style-on {
          font-size: 0.9375rem;
          color: var(--color-text-primary);
        }

        /* Start button */
        .session-config-start {
          width: 100%;
          margin-bottom: 0.75rem;
          padding: 0.75rem;
          font-size: 1rem;
        }

        .session-config-back-bottom {
          width: 100%;
        }

        .session-config-error {
          margin-bottom: 0.75rem;
          text-align: center;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .session-config-card {
            padding: 1.25rem;
          }

          .ib-category-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.375rem;
          }

          .ib-category-label {
            min-width: unset;
          }
        }
      `}</style>
    </div>
  );
}
