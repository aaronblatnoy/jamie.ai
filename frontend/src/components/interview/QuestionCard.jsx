/**
 * QuestionCard — Phase 7
 *
 * Displays the current question text in a large, readable card.
 * Props:
 *   question  — string: the question text to display
 *   phase     — string: current state machine phase
 */
import React from 'react';

export default function QuestionCard({ question, phase }) {
  return (
    <div className="question-card card">
      {!question ? (
        <p className="question-card-placeholder">Loading question...</p>
      ) : (
        <p className="question-card-text">{question}</p>
      )}

      <style>{`
        .question-card {
          width: 100%;
          margin-bottom: 1.5rem;
        }

        .question-card-text {
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.6;
          color: var(--color-text-primary);
          font-weight: 500;
        }

        .question-card-placeholder {
          margin: 0;
          font-size: 1rem;
          color: var(--color-text-muted);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
