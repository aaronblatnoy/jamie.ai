/**
 * useAuth — Phase 2 implementation.
 *
 * Returns the AuthContext value: { user, token, isLoading, login, logout }.
 * Throws if called outside of <AuthProvider> (undefined guard).
 */
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
