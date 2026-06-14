/**
 * SessionProgress — Phase 7
 *
 * "Question N of M" progress bar at the top of the interview screen.
 * Props:
 *   current  — 1-based question number being answered
 *   total    — total questions in session (config.count)
 */
import React from 'react';

export default function SessionProgress({ current, total }) {
  const pct = total > 0 ? Math.min((current - 1) / total * 100, 100) : 0;

  return (
    <div className="session-progress" aria-label={`Question ${current} of ${total}`}>
      <div className="session-progress-label">
        <span className="session-progress-text">Question <strong>{current}</strong> of <strong>{total}</strong></span>
      </div>
      <div
        className="session-progress-track"
        role="progressbar"
        aria-valuenow={current - 1}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Progress: ${current - 1} of ${total} questions completed`}
      >
        <div
          className="session-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>

      <style>{`
        .session-progress {
          width: 100%;
          margin-bottom: 1.5rem;
        }

        .session-progress-label {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 0.375rem;
        }

        .session-progress-text {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }

        .session-progress-track {
          width: 100%;
          height: 4px;
          background-color: var(--color-border);
          border-radius: 2px;
          overflow: hidden;
        }

        .session-progress-fill {
          height: 100%;
          background-color: var(--color-accent);
          border-radius: 2px;
          transition: width 0.4s ease;
        }
      `}</style>
    </div>
  );
}
