// Phase 3 — Sign Up Screen (3.2)
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiPost } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';

function validate(email, password, confirm) {
  const errors = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }
  if (password !== confirm) {
    errors.confirm = 'Passwords do not match.';
  }
  return errors;
}

export default function SignUpScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [emailExists, setEmailExists] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError(null);
    setEmailExists(false);

    const errors = validate(email, password, confirm);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const { ok, status, data } = await apiPost('/api/auth/signup', { email, password });
      if (ok && status === 201) {
        login(data.token, data.user);
        navigate('/setup-keys', { replace: true });
      } else if (status === 409) {
        setEmailExists(true);
      } else {
        setServerError('Something went wrong — please try again.');
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
          Create your account
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Email */}
            <div className="form-group">
              <label className="label" htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                className="input-field"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
              />
              {fieldErrors.email && (
                <span id="signup-email-error" className="error-text">{fieldErrors.email}</span>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="label" htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                className="input-field"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
              />
              {fieldErrors.password && (
                <span id="signup-password-error" className="error-text">{fieldErrors.password}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="label" htmlFor="signup-confirm">Confirm Password</label>
              <input
                id="signup-confirm"
                className="input-field"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                aria-describedby={fieldErrors.confirm ? 'signup-confirm-error' : undefined}
              />
              {fieldErrors.confirm && (
                <span id="signup-confirm-error" className="error-text">{fieldErrors.confirm}</span>
              )}
            </div>

            {/* 409 — email already exists */}
            {emailExists && (
              <p className="error-text" style={{ margin: 0 }}>
                An account with this email already exists.{' '}
                <Link to="/signin" className="link">Sign in instead →</Link>
              </p>
            )}

            {/* Other server error */}
            {serverError && (
              <p className="error-text" style={{ margin: 0 }}>{serverError}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {loading
                ? <><span className="spinner spinner--sm" style={{ marginRight: '0.5rem' }} />Creating account…</>
                : 'Create Account'}
            </button>

          </div>
        </form>

        {/* Sign in link */}
        <p style={{
          marginTop: '1.25rem',
          marginBottom: 0,
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
        }}>
          Already have an account?{' '}
          <Link to="/signin" className="link">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
