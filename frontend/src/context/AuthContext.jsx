/**
 * AuthContext — Phase 2 implementation.
 *
 * Context shape: { user, token, isLoading, login(token, user), logout() }
 *
 * user shape (mirrors backend /api/auth/me response):
 *   { id, email, hasAnthropicKey, hasElevenLabsKey,
 *     anthropicKeyVerifiedAt, elevenLabsKeyVerifiedAt }
 *
 * Bootstrap behavior (on mount):
 *   1. Read token from localStorage('jamie_token')
 *   2. If token: GET /api/auth/me
 *        - 200 → set { user, token }; isLoading = false
 *        - 401 / network error → clear localStorage; isLoading = false
 *   3. No token → isLoading = false immediately
 *
 * While isLoading=true, renders a full-screen spinner to prevent
 * layout flash (stops Landing/app flicker on hard refresh).
 */
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/ui/Spinner.jsx';

export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [state, setState] = useState({
    user: null,
    token: null,
    isLoading: true,
  });

  /* ----------------------------------------------------------------
     Bootstrap: restore session from localStorage on mount.
  ---------------------------------------------------------------- */
  useEffect(() => {
    const storedToken = localStorage.getItem('jamie_token');

    if (!storedToken) {
      setState({ user: null, token: null, isLoading: false });
      return;
    }

    // Token found — verify it with the backend.
    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const body = await res.json();
          // Backend returns either { user } or the user object directly.
          const user = body.user ?? body;
          setState({ user, token: storedToken, isLoading: false });
        } else {
          // 401 or other error — token invalid/expired.
          localStorage.removeItem('jamie_token');
          setState({ user: null, token: null, isLoading: false });
        }
      } catch {
        // Network failure — clear to avoid stuck loading state.
        localStorage.removeItem('jamie_token');
        setState({ user: null, token: null, isLoading: false });
      }
    })();
  }, []);

  /* ----------------------------------------------------------------
     login(token, user) — called after successful sign-in or register.
  ---------------------------------------------------------------- */
  const login = useCallback((token, user) => {
    localStorage.setItem('jamie_token', token);
    setState({ user, token, isLoading: false });
  }, []);

  /* ----------------------------------------------------------------
     logout() — best-effort POST to backend, then clear + redirect.
  ---------------------------------------------------------------- */
  const logout = useCallback(() => {
    const storedToken = localStorage.getItem('jamie_token');

    // Best-effort — don't await, don't block on failure.
    if (storedToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
      }).catch(() => {});
    }

    localStorage.removeItem('jamie_token');
    setState({ user: null, token: null, isLoading: false });
    navigate('/');
  }, [navigate]);

  /* ----------------------------------------------------------------
     While bootstrapping, show full-screen spinner to avoid flash.
  ---------------------------------------------------------------- */
  if (state.isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--color-bg)',
        }}
        aria-label="Loading"
        role="status"
      >
        <Spinner />
      </div>
    );
  }

  const value = {
    user: state.user,
    token: state.token,
    isLoading: state.isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
