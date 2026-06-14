import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '720px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}>

        {/* Wordmark */}
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', Times, serif",
          fontSize: '1.25rem',
          fontWeight: 'normal',
          letterSpacing: '-0.01em',
        }}>
          <span style={{ color: 'var(--color-text-primary)' }}>jamie</span>
          <span style={{ color: 'var(--color-accent)' }}>.ai</span>
        </div>

        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'var(--color-text-primary)',
          }}>
            Practice IB interviews with an AI that actually knows the material.
          </h1>
          <p style={{
            margin: 0,
            fontSize: '1.125rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}>
            jamie.ai uses the 400 M&amp;I guide and top RX resources to run realistic mock interviews.
            Your keys, your session, your pace.
          </p>
        </div>

        {/* Value Props */}
        <ul style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <li style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            400 M&amp;I questions across accounting, valuation, DCF, M&amp;A, and LBO
          </li>
          <li style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Speaks out loud and listens to your spoken answers — real interview feel
          </li>
          <li style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            See exactly which key points you hit and missed, every time
          </li>
        </ul>

        {/* CTA Row */}
        <div className="auth-cta-row" style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          <button
            className="btn-primary"
            onClick={() => navigate('/signup')}
            style={{ flex: '1 1 auto', minWidth: '140px' }}
          >
            Create Account
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate('/signin')}
            style={{ flex: '1 1 auto', minWidth: '140px' }}
          >
            Sign In
          </button>
        </div>

        {/* Footer Cost Line */}
        <p style={{
          margin: 0,
          fontSize: '0.8125rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}>
          You bring your own API keys — about $0.05 per session. No subscription. No surprise bills.
        </p>

      </div>
    </div>
  );
}
