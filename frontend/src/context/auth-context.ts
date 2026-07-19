import { createContext, useContext } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface AuthContextType {
  token: string | null;
  user: User | null;
  checkingAuth: boolean;
  login: (token: string, user: User, remember?: boolean) => void;
  logout: () => void;
  isAdmin: () => boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
