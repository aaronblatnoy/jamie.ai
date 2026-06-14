/**
 * App.jsx — React Router v6 route table.
 *
 * Auth guards:
 *   <ProtectedRoute> — no token → <Navigate to="/signin" replace />
 *   <AuthRoute>      — token present → <Navigate to="/app" replace />
 *
 * Phase 2: guards now read from useAuth() (AuthContext) instead of
 * accessing localStorage directly. AuthProvider (from context/) provides
 * the bootstrapped auth state and wraps the entire route tree.
 */
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './hooks/useAuth.js';

// Screens
import LandingPage      from './screens/LandingPage.jsx';
import SignUpScreen     from './screens/SignUpScreen.jsx';
import SignInScreen     from './screens/SignInScreen.jsx';
import ApiKeySetup      from './screens/ApiKeySetup.jsx';
import ModeSelect       from './screens/ModeSelect.jsx';
import SessionConfig    from './screens/SessionConfig.jsx';
import InterviewScreen  from './screens/InterviewScreen.jsx';
import SummaryScreen    from './screens/SummaryScreen.jsx';
import AccountSettings  from './screens/AccountSettings.jsx';

/* ------------------------------------------------------------------
   Auth guard helpers (Phase 2: reads from AuthContext via useAuth)
------------------------------------------------------------------ */

/**
 * Redirects to /signin when no JWT token is present.
 * isLoading is handled by AuthProvider (renders a full-screen spinner),
 * so by the time this renders, isLoading is always false.
 */
function ProtectedRoute() {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/signin" replace />;
  }
  return <Outlet />;
}

/**
 * Redirects to /app when a JWT token is already present.
 * Prevents logged-in users from seeing /signin and /signup.
 */
function AuthRoute({ children }) {
  const { token } = useAuth();
  if (token) {
    return <Navigate to="/app" replace />;
  }
  return children;
}

/** Layout shell for /app/* nested routes. */
function ProtectedLayout() {
  return <Outlet />;
}

/* ------------------------------------------------------------------
   Route Table
------------------------------------------------------------------ */
export default function App() {
  return (
    /*
     * <AuthProvider> wraps all routes so every screen can call useAuth().
     * It bootstraps auth state on mount (reads jamie_token, calls
     * /api/auth/me) and renders a full-screen spinner while loading —
     * preventing the layout flash between Landing and /app on refresh.
     */
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={<LandingPage />}
        />
        <Route
          path="/signup"
          element={
            <AuthRoute>
              <SignUpScreen />
            </AuthRoute>
          }
        />
        <Route
          path="/signin"
          element={
            <AuthRoute>
              <SignInScreen />
            </AuthRoute>
          }
        />

        {/* Auth-required: key setup + settings */}
        <Route element={<ProtectedRoute />}>
          <Route path="/setup-keys" element={<ApiKeySetup />} />
          <Route path="/settings"   element={<AccountSettings />} />

          {/* Protected /app nested layout */}
          <Route path="/app" element={<ProtectedLayout />}>
            <Route index             element={<ModeSelect />} />
            <Route path="configure"  element={<SessionConfig />} />
            <Route path="interview"  element={<InterviewScreen />} />
            <Route path="summary"    element={<SummaryScreen />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
