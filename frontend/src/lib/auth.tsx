import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "./endpoints";
import { tokenStore } from "./api";
import type { AdminUser } from "./types";

const ADMIN_KEY = "dd_admin";

interface AuthState {
  admin: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (permission: "canPublish" | "canDelete") => boolean;
}

const Ctx = createContext<AuthState | null>(null);

const readAdmin = (): AdminUser | null => {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw && tokenStore.get() ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(readAdmin);

  const logout = useCallback(() => {
    tokenStore.clear();
    try { localStorage.removeItem(ADMIN_KEY); } catch { /* ignore */ }
    setAdmin(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    tokenStore.set(res.token);
    try { localStorage.setItem(ADMIN_KEY, JSON.stringify(res.admin)); } catch { /* ignore */ }
    setAdmin(res.admin);
  }, []);

  useEffect(() => {
    window.addEventListener("dd:unauthorized", logout);
    return () => window.removeEventListener("dd:unauthorized", logout);
  }, [logout]);

  const can = useCallback(
    (p: "canPublish" | "canDelete") => !!admin && (admin.role === "superadmin" || !!admin.permissions?.[p]),
    [admin]
  );

  const value = useMemo(() => ({ admin, login, logout, can }), [admin, login, logout, can]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
};
