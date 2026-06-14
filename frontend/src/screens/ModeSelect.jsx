/**
 * ModeSelect — Mode selection screen after auth.
 * Pick IB, RX, or Behavioral.
 * Header: wordmark (left) + gear icon (right -> /settings)
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

/* ---- Mode definitions -------------------------------------------------- */
const MODES = [
  {
    key: 'ib',
    title: 'Investment Banking',
    subLabel: '400 M&I guide · Technical',
    description: 'Accounting, valuation, DCF, M&A, LBO',
    disabled: false,
  },
  {
    key: 'rx',
    title: 'Restructuring',
    subLabel: '9 RX guides · Advanced technical',
    description: 'Chapter 11, recovery waterfall, bond math, covenants',
    disabled: false,
  },
  {
    key: 'behavioral',
    title: 'Behavioral',
    subLabel: 'Fit questions · Coming soon',
    description: 'STAR-format questions for senior fit rounds',
    disabled: true,
  },
];

/* ---- Inline SVG gear icon (no icon library) ---------------------------- */
function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/* ---- Mode card --------------------------------------------------------- */
function ModeCard({ mode, onSelect }) {
  if (mode.disabled) {
    return (
      <div className="mode-card mode-card--disabled" aria-disabled="true">
        <h2 className="mode-card__title mode-card__title--disabled">{mode.title}</h2>
        <p className="mode-card__sub-label">{mode.subLabel}</p>
        <p className="mode-card__description">{mode.description}</p>
      </div>
    );
  }

  return (
    <div
      className="mode-card"
      onClick={() => onSelect(mode.key)}
      role="button"
      tabIndex={0}
      aria-label={`Start ${mode.title} practice`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(mode.key);
        }
      }}
    >
      <h2 className="mode-card__title">{mode.title}</h2>
      <p className="mode-card__sub-label">{mode.subLabel}</p>
      <p className="mode-card__description">{mode.description}</p>
      <button
        className="btn-primary mode-card__cta"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(mode.key);
        }}
        tabIndex={-1}
        aria-hidden="true"
      >
        Start &rarr;
      </button>
    </div>
  );
}

/* ---- Main screen ------------------------------------------------------- */
export default function ModeSelect() {
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleSelectMode(modeKey) {
    navigate(`/app/configure?mode=${modeKey}`);
  }

  return (
    <div className="mode-select">
      {/* Header bar */}
      <header className="mode-select__header">
        <span className="mode-select__wordmark">
          <span style={{ color: 'var(--color-text-primary)' }}>jamie</span>
          <span style={{ color: 'var(--color-accent)' }}>.ai</span>
        </span>
        <button
          className="btn-ghost mode-select__gear"
          onClick={() => navigate('/settings')}
          title="Account & API keys"
          aria-label="Account & API keys"
        >
          <GearIcon />
        </button>
      </header>

      {/* Main content */}
      <main className="mode-select__main">
        <h1 className="mode-select__heading">What do you want to practice?</h1>

        <div className="mode-select__grid">
          {MODES.map((mode) => (
            <ModeCard key={mode.key} mode={mode} onSelect={handleSelectMode} />
          ))}
        </div>

        {/* Voice status note */}
        <div className="mode-select__voice-note">
          {user && !user.hasElevenLabsKey ? (
            <p className="mode-select__voice-off">
              Voice mode is off — add your ElevenLabs key in{' '}
              <button
                className="link"
                onClick={() => navigate('/settings')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                Settings
              </button>{' '}
              to enable voice.
            </p>
          ) : user && user.hasElevenLabsKey ? (
            <p className="mode-select__voice-on">Voice enabled</p>
          ) : null}
        </div>
      </main>

      <style>{`
        /* ---- ModeSelect layout ---- */
        .mode-select {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--color-bg);
        }

        /* Header */
        .mode-select__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 820px;
          width: 100%;
          margin: 0 auto;
          padding: 1.25rem 1.5rem;
        }

        .mode-select__wordmark {
          font-family: var(--font-serif);
          font-size: 1.375rem;
          font-weight: normal;
          letter-spacing: -0.01em;
        }

        .mode-select__gear {
          padding: 0.5rem;
          color: var(--color-text-secondary);
          border-radius: var(--radius);
        }
        .mode-select__gear:hover {
          color: var(--color-text-primary);
        }

        /* Main */
        .mode-select__main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1.5rem 3rem;
          max-width: 820px;
          width: 100%;
          margin: 0 auto;
        }

        .mode-select__heading {
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 2rem;
          text-align: center;
        }

        /* Mode card grid */
        .mode-select__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          width: 100%;
        }

        /* Individual mode card */
        .mode-card {
          background-color: var(--color-surface);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          padding: 1.75rem 1.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
          cursor: pointer;
          transition: border-color var(--transition), box-shadow var(--transition),
            transform var(--transition);
          outline: none;
        }
        .mode-card:hover,
        .mode-card:focus-visible {
          border-color: var(--color-accent);
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .mode-card--disabled {
          cursor: default;
          opacity: 0.45;
        }
        .mode-card--disabled:hover {
          border-color: var(--color-border);
          box-shadow: var(--shadow-sm);
          transform: none;
        }

        .mode-card__title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .mode-card__title--disabled {
          color: var(--color-text-secondary);
        }

        .mode-card__sub-label {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          margin: 0;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .mode-card__description {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          margin: 0.25rem 0 0;
          line-height: 1.4;
          flex: 1;
        }

        .mode-card__cta {
          margin-top: 1.25rem;
          width: 100%;
        }

        /* Voice status note */
        .mode-select__voice-note {
          margin-top: 2rem;
          min-height: 1.5rem;
          text-align: center;
        }

        .mode-select__voice-off {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .mode-select__voice-off .link {
          font-size: 0.875rem;
        }

        .mode-select__voice-on {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
