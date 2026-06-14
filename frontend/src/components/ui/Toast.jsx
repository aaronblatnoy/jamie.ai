/**
 * Toast.jsx — Phase 9
 *
 * Lightweight toast notification system. No external library.
 *
 * Exports:
 *   ToastContext    — React context (consumed via useToast)
 *   ToastProvider   — wraps your app; renders the toast container
 *   useToast()      — returns { showToast(message, variant) }
 *
 * Variants: 'success' | 'error' | 'info'
 * Position: fixed bottom-right
 * Auto-dismiss: 4 seconds
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';

/* ----------------------------------------------------------------
   Context
---------------------------------------------------------------- */
export const ToastContext = createContext(undefined);

/* ----------------------------------------------------------------
   Single Toast item component
---------------------------------------------------------------- */
function ToastItem({ id, message, variant, onDismiss }) {
  // Auto-dismiss after 4 seconds.
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const variantStyles = {
    success: {
      borderColor: 'var(--color-success)',
      iconColor: 'var(--color-success)',
      icon: '✓',
    },
    error: {
      borderColor: 'var(--color-error)',
      iconColor: 'var(--color-error)',
      icon: '✗',
    },
    info: {
      borderColor: 'var(--color-accent)',
      iconColor: 'var(--color-accent)',
      icon: 'ℹ',
    },
  };

  const styles = variantStyles[variant] || variantStyles.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.625rem',
        padding: '0.875rem 1rem',
        background: 'var(--color-surface-raised)',
        border: '1.5px solid',
        borderColor: styles.borderColor,
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-md)',
        minWidth: '260px',
        maxWidth: '360px',
        animation: 'toast-slide-in 150ms ease',
      }}
    >
      {/* Variant icon */}
      <span
        style={{
          color: styles.iconColor,
          fontWeight: 700,
          fontSize: '1rem',
          lineHeight: '1.4',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {styles.icon}
      </span>

      {/* Message */}
      <span
        style={{
          color: 'var(--color-text-primary)',
          fontSize: '0.9375rem',
          lineHeight: '1.4',
          flex: 1,
        }}
      >
        {message}
      </span>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0 0.125rem',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        ✕
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------
   ToastProvider — wrap your app (or the relevant sub-tree)
---------------------------------------------------------------- */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, variant = 'info') => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          alignItems: 'flex-end',
          pointerEvents: toasts.length === 0 ? 'none' : 'auto',
        }}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            id={toast.id}
            message={toast.message}
            variant={toast.variant}
            onDismiss={dismiss}
          />
        ))}
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(1rem); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

/* ----------------------------------------------------------------
   useToast hook — call anywhere inside <ToastProvider>
---------------------------------------------------------------- */
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}

/* ----------------------------------------------------------------
   Default export — the bare ToastItem for backward compat with
   any Phase 1 import of `Toast` as default.
   (App.jsx doesn't import Toast directly; AccountSettings uses useToast.)
---------------------------------------------------------------- */
export default function Toast({ message, variant, onDismiss }) {
  const noop = useCallback(() => {}, []);
  return (
    <ToastItem
      id={0}
      message={message}
      variant={variant || 'info'}
      onDismiss={onDismiss || noop}
    />
  );
}
