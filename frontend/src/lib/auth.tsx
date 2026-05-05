"use client";

import { createContext, useEffect, useState } from "react";

import { apiFetch, setAccessToken } from "@/lib/api";
import type { AuthUser, TokenResponse } from "@/types";

// Access token lives in the api.ts module (in-memory).
// sessionStorage backs it up so page refresh within a tab doesn't force re-login.
// sessionStorage is scoped to the tab and cleared on browser close — safer than
// localStorage for JWTs. A proper httpOnly cookie solution is planned for Step 19.
const SESSION_KEY = "totem_token";

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, displayName: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? sessionStorage.getItem(SESSION_KEY) : null;

    if (!token) {
      setIsLoading(false);
      return;
    }

    setAccessToken(token);
    apiFetch<AuthUser>("/api/v1/users/me")
      .then(setUser)
      .catch(() => {
        // Token invalid or expired — clear it so the user goes to login
        sessionStorage.removeItem(SESSION_KEY);
        setAccessToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const data = await apiFetch<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
    });
    sessionStorage.setItem(SESSION_KEY, data.access_token);
    setAccessToken(data.access_token);
    setUser(data.user);
  };

  const register = async (
    email: string,
    displayName: string,
    password: string,
  ): Promise<void> => {
    const data = await apiFetch<TokenResponse>("/api/v1/auth/register", {
      method: "POST",
      body: { email, display_name: displayName, password },
    });
    sessionStorage.setItem(SESSION_KEY, data.access_token);
    setAccessToken(data.access_token);
    setUser(data.user);
  };

  const logout = (): void => {
    sessionStorage.removeItem(SESSION_KEY);
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
