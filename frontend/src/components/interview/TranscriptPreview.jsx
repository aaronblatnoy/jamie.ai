/**
 * TranscriptPreview — Phase 7
 *
 * Displays live interim + final transcript as the user speaks.
 * Props:
 *   transcript  — string: current interim/final recognized text
 *   isFinal     — boolean: whether this is a finalized transcript
 */
import React from 'react';

export default function TranscriptPreview({ transcript, isFinal }) {
  if (!transcript) return null;

  return (
    <div
      className={`transcript-preview ${isFinal ? 'transcript-preview--final' : 'transcript-preview--interim'}`}
      aria-live="polite"
      aria-label="Live transcript"
    >
      <p className="transcript-text">{transcript}</p>

      <style>{`
        .transcript-preview {
          width: 100%;
          padding: 0.875rem 1rem;
          border-radius: var(--radius);
          border: 1.5px solid var(--color-border);
          background-color: var(--color-surface-raised);
          margin-bottom: 1rem;
          min-height: 3.5rem;
          transition: border-color var(--transition);
        }

        .transcript-preview--interim {
          border-color: var(--color-border);
          opacity: 0.85;
        }

        .transcript-preview--final {
          border-color: var(--color-accent);
        }

        .transcript-text {
          margin: 0;
          font-size: 0.9375rem;
          line-height: 1.6;
          color: var(--color-text-primary);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
