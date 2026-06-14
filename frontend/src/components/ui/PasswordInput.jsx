/**
 * PasswordInput — Phase 4 implementation.
 *
 * Reusable masked/revealed password input with an inline SVG eye toggle.
 * Used in the API key wizard (Phase 4) and Account Settings (Phase 9).
 *
 * Props:
 *   value        {string}   controlled value
 *   onChange     {function} change handler
 *   placeholder  {string}   placeholder text
 *   label        {string}   visible label above the input
 *   name         {string}   input name attribute
 *   autoComplete {string}   autocomplete attribute (e.g. "current-password")
 */
import React, { useState } from 'react';

/* ---- Inline SVG eye icons (no icon library dependency) ---- */

function EyeOpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  label,
  name,
  autoComplete,
}) {
  const [revealed, setRevealed] = useState(false);

  const inputId = name || 'password-input';

  return (
    <div className="form-group">
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={inputId}
          type={revealed ? 'text' : 'password'}
          className="input-field"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          name={name}
          autoComplete={autoComplete}
          style={{ paddingRight: '2.75rem' }}
        />
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? 'Hide key' : 'Show key'}
          style={{
            position: 'absolute',
            right: '0.75rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            padding: '0',
            transition: 'color var(--transition)',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = 'var(--color-text-secondary)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'var(--color-text-muted)')
          }
        >
          {revealed ? <EyeClosedIcon /> : <EyeOpenIcon />}
        </button>
      </div>
    </div>
  );
}
