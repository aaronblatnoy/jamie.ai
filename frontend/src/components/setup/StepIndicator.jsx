/**
 * StepIndicator — Phase 4 implementation.
 *
 * Three numbered circles connected by a horizontal line.
 * States per circle:
 *   Pending:  outlined circle, muted text
 *   Active:   filled accent circle, primary text, subtle glow
 *   Complete: filled accent circle with ✓ checkmark
 *
 * Props:
 *   step  {number} 1-based current step (1|2|3)
 *   total {number} total number of steps
 */
import React from 'react';

export default function StepIndicator({ step, total }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
      }}
      role="list"
      aria-label={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const num = i + 1;
        const isComplete = num < step;
        const isActive = num === step;
        const isPending = num > step;

        /* Circle styles */
        let circleBg = 'transparent';
        let circleBorder = 'var(--color-border)';
        let circleColor = 'var(--color-text-muted)';
        let circleBoxShadow = 'none';

        if (isComplete || isActive) {
          circleBg = 'var(--color-accent)';
          circleBorder = 'var(--color-accent)';
          circleColor = '#1A1A1A';
        }
        if (isActive) {
          circleBoxShadow = '0 0 0 4px rgba(45, 106, 79, 0.25)';
        }

        return (
          <React.Fragment key={num}>
            {/* Connector line before this circle (skip the first) */}
            {i > 0 && (
              <div
                aria-hidden="true"
                style={{
                  flex: 1,
                  height: '2px',
                  maxWidth: '80px',
                  backgroundColor:
                    num <= step
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  transition: 'background-color 300ms ease',
                  margin: '0 0.5rem',
                }}
              />
            )}

            {/* Step circle */}
            <div
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
              aria-label={
                isComplete
                  ? `Step ${num} complete`
                  : isActive
                  ? `Step ${num} current`
                  : `Step ${num} pending`
              }
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: `2px solid ${circleBorder}`,
                backgroundColor: circleBg,
                color: circleColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition:
                  'background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease',
                boxShadow: circleBoxShadow,
                flexShrink: 0,
              }}
            >
              {isComplete ? '✓' : num}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
