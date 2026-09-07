"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, ApiError, type User, type Wallet } from "@/lib/api";

const TOKEN_KEY = "wallet_token";

type AuthState = {
  token: string | null;
  user: User | null;
  wallet: Wallet | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshWallet: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

function decodeUserId(token: string): { sub: string; exp?: number } | null {
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodeUserId(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 < Date.now();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setWallet(null);
  }, []);

  const loadSession = useCallback(
    async (tkn: string) => {
      const payload = decodeUserId(tkn);
      if (!payload?.sub || isExpired(tkn)) {
        logout();
        return;
      }
      try {
        const u = await api.getUser(payload.sub);
        const w = await api.getWallet(tkn, payload.sub);
        setUser(u);
        setWallet(w);
        setToken(tkn);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logout();
        } else {
          // Keep the token but surface a partial session.
          setToken(tkn);
        }
      }
    },
    [logout],
  );

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    loadSession(stored).finally(() => setLoading(false));
  }, [loadSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      await loadSession(res.access_token);
    },
    [loadSession],
  );

  const refreshWallet = useCallback(async () => {
    if (!token || !user) return;
    try {
      const w = await api.getWallet(token, user.id);
      setWallet(w);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) logout();
    }
  }, [token, user, logout]);

  const value = useMemo<AuthState>(
    () => ({ token, user, wallet, loading, login, logout, refreshWallet }),
    [token, user, wallet, loading, login, logout, refreshWallet],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
