/**
 * PushToTalkButton — Phase 7
 *
 * Push-to-talk / tap-to-toggle button for recording answers.
 *
 * Props:
 *   inputMode     — 'hold' | 'tap'
 *   isRecording   — boolean: currently recording
 *   isDisabled    — boolean: disable interaction
 *   onStart       — () => void: called when recording should begin
 *   onStop        — () => void: called when recording should end
 *
 * Hold mode:  mousedown/touchstart → start; mouseup/touchend → stop
 * Tap mode:   click → toggle
 * Spacebar:   same as primary action in both modes
 *             (preventDefault to stop page scroll; held-flag for auto-repeat)
 */
import React, { useEffect, useRef } from 'react';

export default function PushToTalkButton({ inputMode = 'hold', isRecording, isDisabled, onStart, onStop }) {
  const heldRef = useRef(false); // track keydown auto-repeat

  /* Spacebar support */
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.code !== 'Space') return;
      if (isDisabled) return;

      e.preventDefault(); // stop page scroll

      if (inputMode === 'hold') {
        if (!heldRef.current) {
          heldRef.current = true;
          onStart?.();
        }
        // ignore auto-repeat (held-flag prevents double-start)
      } else {
        // tap mode: only act on first keydown (not auto-repeat)
        if (!e.repeat) {
          if (isRecording) {
            onStop?.();
          } else {
            onStart?.();
          }
        }
      }
    }

    function handleKeyUp(e) {
      if (e.code !== 'Space') return;
      if (isDisabled) return;
      if (inputMode === 'hold') {
        heldRef.current = false;
        onStop?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [inputMode, isRecording, isDisabled, onStart, onStop]);

  /* Touch / mouse handlers for hold mode */
  function handlePointerDown(e) {
    if (isDisabled) return;
    if (inputMode === 'hold') {
      e.preventDefault();
      onStart?.();
    }
  }

  function handlePointerUp(e) {
    if (isDisabled) return;
    if (inputMode === 'hold') {
      onStop?.();
    }
  }

  function handleClick() {
    if (isDisabled) return;
    if (inputMode === 'tap') {
      if (isRecording) {
        onStop?.();
      } else {
        onStart?.();
      }
    }
  }

  const label = inputMode === 'hold'
    ? (isRecording ? 'Recording — release to stop' : 'Hold to record your answer')
    : (isRecording ? 'Recording — tap to stop'     : 'Tap to start recording');

  return (
    <div className="ptt-container">
      <button
        className={`ptt-btn ${isRecording ? 'ptt-btn--recording' : ''} ${isDisabled ? 'ptt-btn--disabled' : ''}`}
        aria-label={label}
        aria-pressed={isRecording}
        disabled={isDisabled}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={inputMode === 'hold' && isRecording ? handlePointerUp : undefined}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onClick={handleClick}
      >
        {/* Microphone icon */}
        <svg
          className="ptt-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
          <path
            d="M5 10a7 7 0 0 0 14 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <p className="ptt-hint">
        {isDisabled ? '' : (
          inputMode === 'hold'
            ? 'Hold or hold Space to record'
            : 'Click or press Space to toggle recording'
        )}
      </p>

      <style>{`
        .ptt-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.625rem;
          margin: 1rem 0;
        }

        .ptt-btn {
          width: 80px;
          height: 80px;
          min-width: 72px;
          min-height: 72px;
          border-radius: 50%;
          border: 3px solid var(--color-border);
          background-color: var(--color-surface-2);
          color: var(--color-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color var(--transition), background-color var(--transition),
                      color var(--transition), transform var(--transition),
                      box-shadow var(--transition);
          touch-action: none;
          -webkit-user-select: none;
          user-select: none;
        }

        .ptt-btn:hover:not(:disabled) {
          border-color: var(--color-accent);
          color: var(--color-accent);
          background-color: rgba(45, 106, 79, 0.08);
        }

        .ptt-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        .ptt-btn--recording {
          border-color: var(--color-error) !important;
          background-color: rgba(239, 68, 68, 0.12) !important;
          color: var(--color-error) !important;
          box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.15),
                      0 0 20px rgba(239, 68, 68, 0.3);
          animation: ptt-pulse 1.2s ease-in-out infinite;
        }

        @keyframes ptt-pulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(239,68,68,0.15), 0 0 20px rgba(239,68,68,0.3); }
          50%       { box-shadow: 0 0 0 12px rgba(239,68,68,0.08), 0 0 28px rgba(239,68,68,0.4); }
        }

        .ptt-btn--disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .ptt-icon {
          width: 32px;
          height: 32px;
          pointer-events: none;
        }

        .ptt-hint {
          margin: 0;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-align: center;
          min-height: 1.2em;
        }
      `}</style>
    </div>
  );
}
