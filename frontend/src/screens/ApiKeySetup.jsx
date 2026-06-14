/**
 * ApiKeySetup — Phase 4 implementation.
 *
 * Three-step wizard for entering and verifying API keys.
 *   Step 1: Anthropic key
 *   Step 2: ElevenLabs key (optional — may be skipped)
 *   Step 3: Verify (POST /api/user/keys/verify) + confetti on success
 *
 * Local state: { step: 1|2|3, anthropicKey: string, elevenLabsKey: string|null }
 *
 * "Fix my keys" from Step 3 goes back to Step 1 with correct pre-fill:
 *   - If Anthropic passed: restore its key value; leave ElevenLabs as-is
 *   - Clear the failed key field so the user re-enters it
 */
import React, { useState } from 'react';
import StepIndicator from '../components/setup/StepIndicator.jsx';
import KeyStep from '../components/setup/KeyStep.jsx';
import VerifyStep from '../components/setup/VerifyStep.jsx';

export default function ApiKeySetup() {
  const [step, setStep] = useState(1);
  const [anthropicKey, setAnthropicKey] = useState('');
  // null means "explicitly skipped"; empty string means "hasn't entered yet"
  const [elevenLabsKey, setElevenLabsKey] = useState('');

  /* ---- Step 1 → Step 2 ---- */
  function handleAnthropicNext() {
    setStep(2);
  }

  /* ---- Step 2 back → Step 1 ---- */
  function handleElevenLabsBack() {
    setStep(1);
  }

  /* ---- Step 2 skip → Step 3 with null ---- */
  function handleElevenLabsSkip() {
    setElevenLabsKey(null);
    setStep(3);
  }

  /* ---- Step 2 next → Step 3 ---- */
  function handleElevenLabsNext() {
    setStep(3);
  }

  /* ---- Step 3 "Fix my keys" ---- */
  // anthropicPassed: the anthropic key was valid (keep it)
  // elevenLabsPassed: the elevenlabs key was valid (keep it)
  function handleFixKeys({ anthropicPassed, elevenLabsPassed }) {
    if (!anthropicPassed) {
      setAnthropicKey('');
    }
    // If ElevenLabs passed (was entered and valid), keep it as-is.
    // If it failed, clear it. If it was null (skipped), leave it as null
    // so the user can re-enter if they want.
    if (elevenLabsKey !== null && !elevenLabsPassed) {
      setElevenLabsKey('');
    }
    setStep(1);
  }

  /* ---- Step label (used for screen reader + heading context) ---- */
  const stepLabels = ['Anthropic Key', 'ElevenLabs Key', 'Verifying'];

  return (
    /* Full-viewport dark bg centering */
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'var(--color-bg)',
      }}
    >
      {/* Wordmark above card */}
      <div
        aria-label="jamie.ai"
        style={{
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
          marginBottom: '1.25rem',
        }}
      >
        <span style={{ color: 'var(--color-text-primary)' }}>jamie</span>
        <span style={{ color: 'var(--color-accent)' }}>.ai</span>
      </div>

      {/* Wizard card */}
      <div
        className="card"
        style={{ width: '100%', maxWidth: '560px' }}
        role="main"
        aria-label={`API key setup — ${stepLabels[step - 1]}`}
      >
        {/* Step indicator at the top of the card */}
        <StepIndicator step={step} total={3} />

        {/* Active step content */}
        {step === 1 && (
          <KeyStep
            variant="anthropic"
            value={anthropicKey}
            onChange={setAnthropicKey}
            onNext={handleAnthropicNext}
          />
        )}

        {step === 2 && (
          <KeyStep
            variant="elevenlabs"
            value={elevenLabsKey ?? ''}
            onChange={setElevenLabsKey}
            onNext={handleElevenLabsNext}
            onBack={handleElevenLabsBack}
            onSkip={handleElevenLabsSkip}
          />
        )}

        {step === 3 && (
          <VerifyStep
            anthropicKey={anthropicKey}
            elevenLabsKey={elevenLabsKey}
            onFixKeys={handleFixKeys}
          />
        )}
      </div>

      {/* Step counter below card (small, muted) */}
      <p
        aria-hidden="true"
        style={{
          marginTop: '1.25rem',
          fontSize: '0.8125rem',
          color: 'var(--color-text-muted)',
        }}
      >
        Step {step} of 3
      </p>
    </div>
  );
}
