/**
 * VerifyStep — Phase 4 implementation.
 *
 * Step 3 of the API key wizard. On mount, calls POST /api/user/keys/verify,
 * shows a status table, fires confetti if all keys are valid, and provides
 * navigation to [Start Practicing] or [Fix my keys] / [Try again].
 *
 * Props:
 *   anthropicKey  {string}       the key value from Step 1
 *   elevenLabsKey {string|null}  the key value from Step 2, or null if skipped
 *   onFixKeys     {function}     called with { anthropicPassed, elevenLabsPassed }
 *                                to go back to Step 1 with partial pre-fill info
 *   onStartPracticing {function} called after refreshing user; navigates to /app
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, apiGet } from '../../lib/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import Spinner from '../ui/Spinner.jsx';

/* ---- Status row in the verification table ---- */
function StatusRow({ label, status, errorMessage }) {
  let icon, text, color;

  switch (status) {
    case 'valid':
      icon = '✓';
      text = 'Verified';
      color = 'var(--color-success)';
      break;
    case 'invalid':
      icon = '✗';
      text = 'Invalid';
      color = 'var(--color-error)';
      break;
    case 'skipped':
      icon = '—';
      text = 'Skipped';
      color = 'var(--color-text-muted)';
      break;
    default:
      icon = '…';
      text = 'Checking';
      color = 'var(--color-text-muted)';
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0.875rem 1rem',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{label}</span>
        <span
          style={{
            color,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            transition: 'color 200ms ease',
          }}
          role="status"
          aria-label={`${label}: ${text}`}
        >
          <span aria-hidden="true">{icon}</span>
          {text}
        </span>
      </div>
      {errorMessage && (
        <p
          className="error-text"
          style={{ marginTop: '0.375rem', marginBottom: 0 }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/* ---- Error messages per key type ---- */
function anthropicErrorMessage(apiError) {
  if (!apiError) return null;
  return `This key was rejected by Anthropic. Make sure you copied the full key starting with sk-ant-`;
}

function elevenLabsErrorMessage(apiError) {
  if (!apiError) return null;
  return `Key not recognized. Check your ElevenLabs profile page for the correct key.`;
}

/* ---- Main component ---- */
export default function VerifyStep({ anthropicKey, elevenLabsKey, onFixKeys }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const confettiFired = useRef(false);

  const [phase, setPhase] = useState('loading'); // 'loading' | 'done'
  const [anthropicResult, setAnthropicResult] = useState(null);
  const [elevenLabsResult, setElevenLabsResult] = useState(null);
  const [navigating, setNavigating] = useState(false);

  /* Computed: which keys are invalid (among those that were provided) */
  const anthropicInvalid = anthropicResult && !anthropicResult.valid;
  const elevenLabsInvalid =
    elevenLabsKey !== null && elevenLabsResult && !elevenLabsResult.valid;
  const anyInvalid = anthropicInvalid || elevenLabsInvalid;
  const allValid = phase === 'done' && !anyInvalid;

  /* ---- Verify call ---- */
  const runVerify = useCallback(async () => {
    setPhase('loading');
    setAnthropicResult(null);
    setElevenLabsResult(null);
    confettiFired.current = false;

    // Save keys to DB first, then verify from DB.
    const saveBody = { anthropicKey };
    if (elevenLabsKey !== null) saveBody.elevenLabsKey = elevenLabsKey;
    await apiPost('/api/user/keys', saveBody);

    const { ok, data } = await apiPost('/api/user/keys/verify', {});

    if (!ok || !data) {
      // Network failure — treat both as failed so user can retry
      setAnthropicResult({ valid: false, error: 'Network error' });
      setElevenLabsResult(elevenLabsKey !== null ? { valid: false, error: 'Network error' } : null);
      setPhase('done');
      return;
    }

    setAnthropicResult(data.anthropic ?? { valid: false, error: 'No response' });
    setElevenLabsResult(data.elevenLabs ?? null);
    setPhase('done');
  }, [anthropicKey, elevenLabsKey]);

  /* On mount, immediately verify */
  useEffect(() => {
    runVerify();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Fire confetti when all keys pass */
  useEffect(() => {
    if (allValid && !confettiFired.current) {
      confettiFired.current = true;
      import('canvas-confetti').then((mod) => {
        const confettiLib = mod.default;
        // Create a dedicated canvas so we can mark it aria-hidden
        const canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        document.body.appendChild(canvas);

        const confetti = confettiLib.create(canvas, { resize: true });
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#1A7A4A', '#34A853', '#F0EDE4'],
          ticks: 200,
        }).then(() => {
          // Remove canvas after animation completes
          try { document.body.removeChild(canvas); } catch {}
        });
      });
    }
  }, [allValid]);

  /* ---- [Start Practicing] handler ---- */
  async function handleStartPracticing() {
    setNavigating(true);
    try {
      // Refresh user object so hasAnthropicKey reflects true
      const { ok, data } = await apiGet('/api/auth/me');
      if (ok && data) {
        const user = data.user ?? data;
        const token = localStorage.getItem('jamie_token');
        login(token, user);
      }
    } catch {
      // Best-effort; navigate regardless
    }
    navigate('/app');
  }

  /* ---- [Fix my keys] handler ---- */
  function handleFixKeys() {
    const anthropicPassed = anthropicResult && anthropicResult.valid;
    const elevenLabsPassed =
      elevenLabsKey !== null && elevenLabsResult && elevenLabsResult.valid;
    onFixKeys({ anthropicPassed, elevenLabsPassed });
  }

  /* ---- Derive display status for ElevenLabs row ---- */
  function getElevenLabsStatus() {
    if (elevenLabsKey === null) return 'skipped';
    if (!elevenLabsResult) return 'loading';
    return elevenLabsResult.valid ? 'valid' : 'invalid';
  }

  function getAnthropicStatus() {
    if (!anthropicResult) return 'loading';
    return anthropicResult.valid ? 'valid' : 'invalid';
  }

  /* ---- Render: loading ---- */
  if (phase === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <Spinner />
        <p
          style={{
            marginTop: '1rem',
            color: 'var(--color-text-secondary)',
          }}
          aria-live="polite"
        >
          Checking your keys, one moment...
        </p>
      </div>
    );
  }

  /* ---- Render: done ---- */
  return (
    <div>
      <h2
        style={{
          marginTop: 0,
          marginBottom: '1rem',
          fontSize: '1.375rem',
        }}
      >
        {allValid ? "You're all set!" : 'Key Verification'}
      </h2>

      {/* Status table */}
      <div
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}
        role="table"
        aria-label="API key verification results"
      >
        <StatusRow
          label="Anthropic API Key"
          status={getAnthropicStatus()}
          errorMessage={
            anthropicInvalid ? anthropicErrorMessage(anthropicResult?.error) : null
          }
        />
        <StatusRow
          label="ElevenLabs API Key"
          status={getElevenLabsStatus()}
          errorMessage={
            elevenLabsInvalid ? elevenLabsErrorMessage(elevenLabsResult?.error) : null
          }
        />
      </div>

      {/* Success state */}
      {allValid && (
        <div
          aria-live="polite"
          style={{ textAlign: 'center' }}
        >
          <p
            style={{
              color: 'var(--color-success)',
              fontWeight: 500,
              marginBottom: '1.25rem',
            }}
          >
            Let's start practicing.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={handleStartPracticing}
            disabled={navigating}
            style={{ minWidth: '180px' }}
          >
            {navigating ? 'Loading...' : 'Start Practicing →'}
          </button>
        </div>
      )}

      {/* Failure state */}
      {anyInvalid && (
        <div
          style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
          aria-live="polite"
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={handleFixKeys}
          >
            ← Fix my keys
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={runVerify}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
