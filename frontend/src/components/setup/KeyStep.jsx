/**
 * KeyStep — Phase 4 implementation.
 *
 * Shared component for Step 1 (Anthropic) and Step 2 (ElevenLabs).
 * Controlled by `variant` prop.
 *
 * Props:
 *   variant       {'anthropic' | 'elevenlabs'}
 *   value         {string}   the current key value
 *   onChange      {function} (newValue: string) => void
 *   onNext        {function} advance to next step
 *   onBack        {function} go back (elevenlabs only)
 *   onSkip        {function} skip with elevenLabsKey=null (elevenlabs only)
 */
import React from 'react';
import PasswordInput from '../ui/PasswordInput.jsx';

/* ---- Anthropic variant content ---- */
function AnthropicContent() {
  return (
    <>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.375rem' }}>
        Get your Anthropic API key
      </h2>

      <a
        href="https://console.anthropic.com/settings/keys"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          margin: '0.75rem 0 1.25rem',
          padding: '0.5rem 0.875rem',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          color: 'var(--color-text)',
          textDecoration: 'none',
          fontSize: '0.875rem',
        }}
      >
        Open Anthropic Console → API Keys
      </a>

      <ol
        style={{
          paddingLeft: '1.25rem',
          margin: '1rem 0',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
        }}
      >
        <li>Create a free account if you don't have one.</li>
        <li>
          Add a payment method. You'll be charged directly by Anthropic —
          roughly $0.05–$0.10 per session of 10 questions.
        </li>
        <li>Click <strong>"Create Key,"</strong> give it any name, and copy it.</li>
      </ol>

      {/* Cost callout */}
      <div
        style={{
          borderLeft: '3px solid var(--color-accent)',
          margin: '1.25rem 0',
          background: 'rgba(45, 106, 79, 0.06)',
          borderRadius: '0 var(--radius) var(--radius) 0',
          padding: '0.875rem 0.875rem 0.875rem 1rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Typical session: $0.05–$0.10.</strong>{' '}
          You are charged by Anthropic directly — Jamie.ai takes nothing from your API usage.
        </p>
      </div>
    </>
  );
}

/* ---- ElevenLabs variant content ---- */
function ElevenLabsContent() {
  return (
    <>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.375rem' }}>
        Set up Jamie's voice <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
      </h2>

      <p style={{ margin: '0.5rem 0 1rem', color: 'var(--color-text-secondary)' }}>
        ElevenLabs gives Jamie a realistic voice. Skip this if you prefer
        text-only feedback — you can always add it later in Settings.
      </p>

      <a
        href="https://elevenlabs.io/app/account"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          margin: '0.75rem 0 1.25rem',
          padding: '0.5rem 0.875rem',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          color: 'var(--color-text)',
          textDecoration: 'none',
          fontSize: '0.875rem',
        }}
      >
        Open ElevenLabs → API Keys
      </a>

      <ol
        style={{
          paddingLeft: '1.25rem',
          margin: '1rem 0',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
        }}
      >
        <li>Create a free account if you don't have one.</li>
        <li>
          Free tier: 10,000 characters/month — about 2–3 full sessions.
        </li>
        <li>Click <strong>"Create API Key,"</strong> name it, and copy it.</li>
      </ol>
    </>
  );
}

/* ---- Security note (shared) ---- */
function SecurityNote() {
  return (
    <p
      className="security-note"
      style={{
        fontSize: '0.8125rem',
        color: 'var(--color-text-muted)',
        marginTop: '0.75rem',
        marginBottom: 0,
      }}
    >
      Your key is encrypted on our servers and never shared, never logged, and
      never used for anything other than your own sessions.
    </p>
  );
}

/* ---- Main component ---- */
export default function KeyStep({ variant, value, onChange, onNext, onBack, onSkip }) {
  const isAnthropicVariant = variant === 'anthropic';

  const inputLabel = isAnthropicVariant
    ? 'Paste your Anthropic API key'
    : 'Paste your ElevenLabs API key (optional)';

  const inputPlaceholder = isAnthropicVariant ? 'sk-ant-...' : 'sk_...';

  const inputName = isAnthropicVariant ? 'anthropic-key' : 'elevenlabs-key';

  const canAdvance = isAnthropicVariant ? value.trim().length > 0 : true;

  return (
    <div>
      {/* Step-specific heading + instructions */}
      {isAnthropicVariant ? <AnthropicContent /> : <ElevenLabsContent />}

      {/* Key input */}
      <PasswordInput
        label={inputLabel}
        placeholder={inputPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        name={inputName}
        autoComplete="off"
      />

      <SecurityNote />

      {/* Navigation buttons */}
      {isAnthropicVariant ? (
        /* Step 1: only [Next →] */
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={onNext}
            disabled={!canAdvance}
          >
            Next →
          </button>
        </div>
      ) : (
        /* Step 2: [← Back] | [Skip for now] | [Next →] */
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            className="btn-ghost"
            onClick={onBack}
          >
            ← Back
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onSkip}
            >
              Skip for now
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onNext}
              disabled={value.trim().length === 0}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
