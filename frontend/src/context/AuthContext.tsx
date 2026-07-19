import { useState, useCallback, useEffect, type ReactNode } from "react";
import { AuthContext, type User } from "./auth-context";
import { api } from "../api";

interface AuthState {
  token: string | null;
  user: User | null;
}

const STORAGE_KEY = "campus-qa-auth";

function loadStoredAuth(): AuthState {
  const saved = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
  if (!saved) return { token: null, user: null };
  try {
    const parsed = JSON.parse(saved) as AuthState;
    if (!parsed.token || !parsed.user) return { token: null, user: null };
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadStoredAuth);
  const [checkingAuth, setCheckingAuth] = useState(() => Boolean(loadStoredAuth().token));

  const login = useCallback((token: string, user: User, remember = true) => {
    const newState = { token, user };
    setState(newState);
    const target = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    target.setItem(STORAGE_KEY, JSON.stringify(newState));
    other.removeItem(STORAGE_KEY);
  }, []);

  const logout = useCallback(() => {
    setState({ token: null, user: null });
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("campus-qa-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("campus-qa-unauthorized", handleUnauthorized);
  }, [logout]);

  useEffect(() => {
    if (!checkingAuth || !state.token) return;
    api.me(state.token)
      .then((user) => setState((current) => ({ ...current, user })))
      .catch(() => logout())
      .finally(() => setCheckingAuth(false));
  }, [checkingAuth, state.token, logout]);

  const isAdmin = useCallback(() => {
    return state.user?.role === "ADMIN";
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, checkingAuth, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
