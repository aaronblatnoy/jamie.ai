/**
 * AccountSettings.jsx — Phase 9
 *
 * Sections:
 *   9.1  Header + back-to-practice link
 *   9.2  API Keys — Anthropic + ElevenLabs rows with inline accordion Update/Add
 *   9.3  Password — current / new / confirm + Update Password
 *   9.4  Account — Sign Out (btn-danger)
 *
 * Toast notifications (9.5) are provided by local <ToastProvider> wrapper
 * at the bottom of this file, so no changes needed to App.jsx.
 */
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth.js';
import { apiPost, apiGet } from '../lib/api.js';
import PasswordInput from '../components/ui/PasswordInput.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { ToastProvider, useToast } from '../components/ui/Toast.jsx';

/* ----------------------------------------------------------------
   relativeTime helper (plain JS, no date-fns)
   < 1 min   → "just now"
   < 1 hr    → "N minutes ago"
   < 1 day   → "N hours ago"
   < 30 days → "N days ago"
   else      → ISO date string
---------------------------------------------------------------- */
function relativeTime(isoString) {
  if (!isoString) return null;
  const then = new Date(isoString);
  const nowMs = Date.now();
  const diffMs = nowMs - then.getTime();

  if (isNaN(diffMs)) return isoString;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);

  if (seconds < 60)  return 'just now';
  if (minutes < 60)  return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24)    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 30)     return `${days} day${days !== 1 ? 's' : ''} ago`;
  return then.toISOString().slice(0, 10); // YYYY-MM-DD
}

/* ----------------------------------------------------------------
   KeyRow — one row in the API Keys section
   Handles its own open/closed accordion state and verify flow.
---------------------------------------------------------------- */
function KeyRow({ keyType, label, placeholder, isSet, verifiedAt, onSuccess }) {
  const { showToast } = useToast();
  const [open, setOpen]         = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const [loading, setLoading]   = useState(false);
  const [rowStatus, setRowStatus] = useState(null); // null | 'ok' | 'fail'
  const [rowError, setRowError]   = useState('');

  const timeStr = relativeTime(verifiedAt);

  function toggle() {
    setOpen((prev) => !prev);
    setRowStatus(null);
    setRowError('');
  }

  async function handleSaveVerify() {
    if (!keyValue.trim()) return;
    setLoading(true);
    setRowStatus(null);
    setRowError('');

    const saveBody =
      keyType === 'anthropic'
        ? { anthropicKey: keyValue.trim() }
        : { elevenLabsKey: keyValue.trim() };

    // Save first, then verify from DB.
    await apiPost('/api/user/keys', saveBody);
    const { ok, data } = await apiPost('/api/user/keys/verify', {});

    if (!ok) {
      setRowStatus('fail');
      setRowError('Network error — please try again.');
      setLoading(false);
      return;
    }

    // Determine which result to inspect.
    const result =
      keyType === 'anthropic'
        ? data?.anthropic
        : data?.elevenLabs;

    if (result?.valid) {
      setRowStatus('ok');
      setKeyValue('');
      showToast(
        `${label} updated and verified.`,
        'success',
      );
      // Refresh user context so hasAnthropicKey / hasElevenLabsKey reflect new state.
      await onSuccess();
      // Keep accordion open briefly so user sees ✓, then close.
      setTimeout(() => {
        setOpen(false);
        setRowStatus(null);
      }, 1800);
    } else {
      setRowStatus('fail');
      setRowError(
        result?.error ||
          `Key not recognized by ${label}. Double-check you copied the full key.`,
      );
    }

    setLoading(false);
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {/* Status row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Left: key label + verified status */}
        <div>
          <div
            style={{
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              marginBottom: '0.2rem',
            }}
          >
            {label}
          </div>
          {isSet ? (
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-success)',
              }}
            >
              ✓ Verified{timeStr ? ` ${timeStr}` : ''}
            </div>
          ) : (
            <div
              style={{
                fontSize: '0.8125rem',
                color: keyType === 'elevenlabs'
                  ? 'var(--color-text-muted)'
                  : 'var(--color-error)',
              }}
            >
              {keyType === 'elevenlabs' ? '— Not set (enables voice)' : '✗ Not set'}
            </div>
          )}
        </div>

        {/* Right: [Update] / [Add] toggle */}
        <button
          className="btn-secondary"
          onClick={toggle}
          aria-expanded={open}
          style={{ flexShrink: 0 }}
        >
          {open ? 'Cancel' : isSet ? 'Update' : 'Add'}
        </button>
      </div>

      {/* Inline accordion */}
      {open && (
        <div
          style={{
            marginTop: '0.875rem',
            padding: '1rem',
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
          }}
        >
          <PasswordInput
            label={`New ${label}`}
            placeholder={placeholder}
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            name={`${keyType}Key`}
            autoComplete="off"
          />

          {/* Inline result */}
          {rowStatus === 'ok' && (
            <p className="success-text" style={{ marginTop: '0.5rem' }}>
              ✓ Verified
            </p>
          )}
          {rowStatus === 'fail' && (
            <p className="error-text" style={{ marginTop: '0.5rem' }}>
              ✗ {rowError}
            </p>
          )}

          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-primary"
              onClick={handleSaveVerify}
              disabled={loading || !keyValue.trim()}
              style={{ minWidth: '140px' }}
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Verifying…
                </>
              ) : (
                'Save & Verify'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   Inner settings page — rendered inside ToastProvider so useToast works.
---------------------------------------------------------------- */
function AccountSettingsInner() {
  const { user, login, logout } = useAuth();
  const { showToast } = useToast();

  // Password section state
  const [pwCurrent, setPwCurrent]   = useState('');
  const [pwNew, setPwNew]           = useState('');
  const [pwConfirm, setPwConfirm]   = useState('');
  const [pwLoading, setPwLoading]   = useState(false);
  const [pwError, setPwError]       = useState('');
  const [pwFieldError, setPwFieldError] = useState(''); // inline validation

  /* Refresh user from /api/auth/me and update AuthContext. */
  const refreshUser = useCallback(async () => {
    const { ok, data } = await apiGet('/api/auth/me');
    if (ok) {
      const updatedUser = data?.user ?? data;
      // Re-use the stored token; login() keeps token identical.
      const token = localStorage.getItem('jamie_token');
      login(token, updatedUser);
    }
  }, [login]);

  /* ---- Password update ---- */
  async function handleUpdatePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwFieldError('');

    // Client-side validation
    if (pwNew.length < 8) {
      setPwFieldError('New password must be at least 8 characters.');
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwFieldError('Passwords do not match.');
      return;
    }

    setPwLoading(true);
    const { ok, status } = await apiPost('/api/auth/password', {
      currentPassword: pwCurrent,
      newPassword: pwNew,
    });
    setPwLoading(false);

    if (ok) {
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
      showToast('Password updated.', 'success');
    } else if (status === 401) {
      setPwError('Current password is incorrect.');
    } else {
      setPwError('Something went wrong — please try again.');
    }
  }

  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '2rem 1rem 4rem',
      }}
    >
      {/* ---- 9.1 Header ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          Account Settings
        </h1>
        <Link to="/app" className="link" style={{ fontSize: '0.9375rem' }}>
          ← Back to Practice
        </Link>
      </div>

      {/* ---- 9.2 API Keys section ---- */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2
          style={{
            margin: '0 0 1.25rem',
            fontSize: '1.0625rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          API Keys
        </h2>

        <KeyRow
          keyType="anthropic"
          label="Anthropic API Key"
          placeholder="sk-ant-…"
          isSet={user?.hasAnthropicKey ?? false}
          verifiedAt={user?.anthropicKeyVerifiedAt}
          onSuccess={refreshUser}
        />

        <hr className="divider" />

        <KeyRow
          keyType="elevenlabs"
          label="ElevenLabs API Key"
          placeholder="sk_…"
          isSet={user?.hasElevenLabsKey ?? false}
          verifiedAt={user?.elevenLabsKeyVerifiedAt}
          onSuccess={refreshUser}
        />
      </section>

      {/* ---- 9.3 Password section ---- */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2
          style={{
            margin: '0 0 1.25rem',
            fontSize: '1.0625rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          Password
        </h2>

        <form onSubmit={handleUpdatePassword} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <PasswordInput
              label="Current Password"
              placeholder="Enter your current password"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              name="currentPassword"
              autoComplete="current-password"
            />
            <PasswordInput
              label="New Password"
              placeholder="Minimum 8 characters"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              name="newPassword"
              autoComplete="new-password"
            />
            <PasswordInput
              label="Confirm New Password"
              placeholder="Re-enter new password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              name="confirmPassword"
              autoComplete="new-password"
            />
          </div>

          {/* Validation / server error */}
          {(pwFieldError || pwError) && (
            <p className="error-text" style={{ marginTop: '0.625rem' }}>
              {pwFieldError || pwError}
            </p>
          )}

          <div style={{ marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}
              style={{ minWidth: '160px' }}
            >
              {pwLoading ? (
                <>
                  <Spinner size="sm" />
                  Updating…
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </section>

      {/* ---- 9.4 Account / Sign Out section ---- */}
      <section className="card">
        <hr className="divider" style={{ marginTop: 0 }} />
        <h2
          style={{
            margin: '0 0 0.75rem',
            fontSize: '1.0625rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          Account
        </h2>
        <p
          style={{
            margin: '0 0 1rem',
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          {user?.email}
        </p>
        <button className="btn-danger" onClick={logout}>
          Sign Out
        </button>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------------
   AccountSettings — wraps inner content with ToastProvider so
   useToast() works without touching App.jsx.
---------------------------------------------------------------- */
export default function AccountSettings() {
  return (
    <ToastProvider>
      <AccountSettingsInner />
    </ToastProvider>
  );
}
