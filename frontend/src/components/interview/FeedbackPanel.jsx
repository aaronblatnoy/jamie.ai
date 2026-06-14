/**
 * FeedbackPanel — Phase 7
 *
 * Shows evaluation results after each question.
 *
 * IB/RX mode:
 *   - Score bar (score * 100%)
 *   - ✓ Hit — green chips for each hit key point
 *   - ✗ Missed — red chips for each missed key point
 *   - Feedback line (italic, muted)
 *
 * Behavioral mode:
 *   - STAR breakdown (4 rows: Situation/Task/Action/Result, 0–3 stars each)
 *   - Overall score bar
 *   - Strengths: green bullet list
 *   - Improvements: amber bullet list
 *   - Feedback line (italic)
 *
 * Props:
 *   evaluation    — the evaluation object from /api/evaluate
 *   mode          — 'ib' | 'rx' | 'behavioral'
 *   onSkipTts     — () => void: called when user clicks ✕ to skip TTS
 *   isPlayingTts  — boolean: TTS currently playing feedback_line
 *   onNextQuestion — () => void: called when [Next Question] clicked
 *   isLastQuestion — boolean: true if this is the final question
 */
import React from 'react';

function StarRow({ label, value }) {
  // value: 0–3
  const stars = Math.max(0, Math.min(3, Math.round(value ?? 0)));
  return (
    <div className="star-row">
      <span className="star-row-label">{label}</span>
      <div className="star-row-stars" aria-label={`${stars} out of 3 stars`}>
        {[1, 2, 3].map(i => (
          <span
            key={i}
            className={`star ${i <= stars ? 'star--filled' : 'star--empty'}`}
            aria-hidden="true"
          >
            {i <= stars ? '★' : '☆'}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ score }) {
  // score: 0.0–1.0
  const pct = Math.round((score ?? 0) * 100);
  const color = pct >= 70 ? 'var(--color-success)'
               : pct >= 40 ? 'var(--color-warning)'
               :              'var(--color-error)';

  return (
    <div className="score-bar-wrap">
      <div className="score-bar-header">
        <span className="score-bar-label">Score</span>
        <span className="score-bar-pct" style={{ color }}>{pct}%</span>
      </div>
      <div
        className="score-bar-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score: ${pct}%`}
      >
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function FeedbackPanel({ evaluation, mode, onSkipTts, isPlayingTts, onNextQuestion, isLastQuestion }) {
  if (!evaluation) return null;

  const isIbRx = mode === 'ib' || mode === 'rx';
  const isBehavioral = mode === 'behavioral';

  return (
    <div className="feedback-panel card feedback-panel-slide-in">
      <div className="feedback-panel-header">
        <h2 className="feedback-panel-title">Feedback</h2>
        {isPlayingTts && (
          <button
            className="btn-ghost feedback-skip-tts"
            onClick={onSkipTts}
            aria-label="Skip audio feedback"
            title="Skip audio feedback"
          >
            ✕ Skip
          </button>
        )}
      </div>

      {/* ---- IB / RX mode ---- */}
      {isIbRx && (
        <div className="feedback-ibr">
          <ScoreBar score={evaluation.score} />

          {evaluation.hit && evaluation.hit.length > 0 && (
            <div className="feedback-section">
              <span className="feedback-section-label feedback-hit-label">✓ Hit</span>
              <div className="feedback-chips">
                {evaluation.hit.map((point, i) => (
                  <span key={i} className="feedback-chip feedback-chip--hit">{point}</span>
                ))}
              </div>
            </div>
          )}

          {evaluation.missed && evaluation.missed.length > 0 && (
            <div className="feedback-section">
              <span className="feedback-section-label feedback-miss-label">✗ Missed</span>
              <div className="feedback-chips">
                {evaluation.missed.map((point, i) => (
                  <span key={i} className="feedback-chip feedback-chip--miss">{point}</span>
                ))}
              </div>
            </div>
          )}

          {evaluation.feedback_line && (
            <p className="feedback-line">{evaluation.feedback_line}</p>
          )}
        </div>
      )}

      {/* ---- Behavioral mode ---- */}
      {isBehavioral && (
        <div className="feedback-behavioral">
          {/* STAR breakdown */}
          {evaluation.star && (
            <div className="feedback-section">
              <span className="feedback-section-label">STAR Breakdown</span>
              <div className="star-rows">
                <StarRow label="Situation" value={evaluation.star.situation} />
                <StarRow label="Task"      value={evaluation.star.task} />
                <StarRow label="Action"    value={evaluation.star.action} />
                <StarRow label="Result"    value={evaluation.star.result} />
              </div>
            </div>
          )}

          <ScoreBar score={evaluation.score} />

          {evaluation.strengths && evaluation.strengths.length > 0 && (
            <div className="feedback-section">
              <span className="feedback-section-label">Strengths</span>
              <ul className="feedback-list feedback-list--strengths">
                {evaluation.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.improvements && evaluation.improvements.length > 0 && (
            <div className="feedback-section">
              <span className="feedback-section-label">Areas to Improve</span>
              <ul className="feedback-list feedback-list--improvements">
                {evaluation.improvements.map((imp, i) => (
                  <li key={i}>{imp}</li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.feedback_line && (
            <p className="feedback-line">{evaluation.feedback_line}</p>
          )}
        </div>
      )}

      {/* Next question button */}
      <div className="feedback-actions">
        <button
          className="btn-primary feedback-next-btn"
          onClick={onNextQuestion}
        >
          {isLastQuestion ? 'View Summary →' : 'Next Question →'}
        </button>
      </div>

      <style>{`
        @keyframes feedback-slide-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .feedback-panel {
          width: 100%;
          margin-top: 1rem;
        }

        .feedback-panel-slide-in {
          animation: feedback-slide-in 0.3s ease forwards;
        }

        .feedback-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .feedback-panel-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .feedback-skip-tts {
          font-size: 0.8125rem;
          padding: 0.25rem 0.625rem;
        }

        /* Score bar */
        .score-bar-wrap {
          margin-bottom: 1rem;
        }

        .score-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.375rem;
        }

        .score-bar-label {
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }

        .score-bar-pct {
          font-size: 1.125rem;
          font-weight: 700;
        }

        .score-bar-track {
          width: 100%;
          height: 8px;
          background-color: var(--color-border);
          border-radius: 4px;
          overflow: hidden;
        }

        .score-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.6s ease;
        }

        /* Sections */
        .feedback-section {
          margin-bottom: 1rem;
        }

        .feedback-section-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          margin-bottom: 0.5rem;
        }

        .feedback-hit-label  { color: var(--color-success); }
        .feedback-miss-label { color: var(--color-error); }

        /* Chips */
        .feedback-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .feedback-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.625rem;
          border-radius: 999px;
          font-size: 0.8125rem;
          font-weight: 500;
        }

        .feedback-chip--hit {
          background-color: rgba(52, 168, 83, 0.12);
          border: 1px solid rgba(52, 168, 83, 0.35);
          color: var(--color-success);
        }

        .feedback-chip--miss {
          background-color: rgba(229, 62, 62, 0.1);
          border: 1px solid rgba(229, 62, 62, 0.3);
          color: var(--color-error);
        }

        /* Feedback line */
        .feedback-line {
          margin: 0 0 0.5rem;
          font-style: italic;
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        /* STAR rows */
        .star-rows {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .star-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .star-row-label {
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          min-width: 80px;
        }

        .star-row-stars {
          display: flex;
          gap: 0.25rem;
        }

        .star {
          font-size: 1.25rem;
          line-height: 1;
        }

        .star--filled { color: var(--color-warning); }
        .star--empty  { color: var(--color-border); }

        /* Behavioral lists */
        .feedback-list {
          margin: 0;
          padding-left: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .feedback-list li {
          font-size: 0.9375rem;
          line-height: 1.5;
        }

        .feedback-list--strengths li {
          color: var(--color-success);
        }

        .feedback-list--improvements li {
          color: var(--color-warning);
        }

        /* Next button */
        .feedback-actions {
          margin-top: 1.25rem;
        }

        .feedback-next-btn {
          width: 100%;
          padding: 0.75rem;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
}
