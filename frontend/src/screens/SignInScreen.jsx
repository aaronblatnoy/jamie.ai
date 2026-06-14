// Phase 3 — Sign In Screen (3.3)
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiPost } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';

export default function SignInScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { ok, status, data } = await apiPost('/api/auth/login', { email, password });
      if (ok && status === 200) {
        login(data.token, data.user);
        if (data.user && data.user.hasAnthropicKey) {
          navigate('/app', { replace: true });
        } else {
          navigate('/setup-keys', { replace: true });
        }
      } else if (status === 401) {
        setError('Incorrect email or password.');
      } else {
        setError('Something went wrong — please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      {/* Wordmark above card */}
      <div style={{
        fontSize: '1.25rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        marginBottom: '1.25rem',
      }}>
        <span style={{ color: 'var(--color-text-primary)' }}>jamie</span>
        <span style={{ color: 'var(--color-accent)' }}>.ai</span>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '440px' }}>
        <h1 style={{
          margin: '0 0 1.5rem',
          fontSize: '1.375rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>
          Welcome back
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Email */}
            <div className="form-group">
              <label className="label" htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                className="input-field"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="label" htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                className="input-field"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="error-text" style={{ margin: 0 }}>{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {loading
                ? <><span className="spinner spinner--sm" style={{ marginRight: '0.5rem' }} />Signing in…</>
                : 'Sign In'}
            </button>

          </div>
        </form>

        {/* Sign up link */}
        <p style={{
          marginTop: '1.25rem',
          marginBottom: '0.5rem',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
        }}>
          New here?{' '}
          <Link to="/signup" className="link">Create an account →</Link>
        </p>

        {/* Forgot password note */}
        <p style={{
          margin: 0,
          fontSize: '0.8125rem',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
        }}>
          Forgot password? Contact{' '}
          <a href="mailto:hello@jamie.ai" className="link">hello@jamie.ai</a>
        </p>
      </div>
    </div>
  );
}
