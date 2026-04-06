import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, error: null, auth: null });

  useEffect(() => {
    const mondayUserId = import.meta.env.VITE_MONDAY_USER_ID;
    const name = import.meta.env.VITE_MONDAY_USER_NAME;

    if (!mondayUserId || !name) {
      console.error('[auth] VITE_MONDAY_USER_ID / VITE_MONDAY_USER_NAME not set in .env');
      Promise.resolve().then(() =>
        setState({ loading: false, error: 'Set VITE_MONDAY_USER_ID and VITE_MONDAY_USER_NAME in .env', auth: null })
      );
      return;
    }

    authApi
      .login({
        mondayUserId,
        name,
        isAdmin: import.meta.env.VITE_MONDAY_USER_IS_ADMIN === 'true',
      })
      .then((auth) => setState({ loading: false, error: null, auth }))
      .catch((err) => {
        console.error('[auth] Login failed:', err);
        setState({ loading: false, error: err.message, auth: null });
      });
  }, []);

  return (
    <AuthContext.Provider value={{ auth: state.auth, authLoading: state.loading, authError: state.error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
