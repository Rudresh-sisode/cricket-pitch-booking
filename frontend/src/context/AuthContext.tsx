import { createContext, useContext, useMemo, useState } from "react";
import { apiRequest } from "../api/client";
import type { User } from "../lib/types";

type AuthContextType = {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_TOKEN_KEY = "cricket_booking_token";
const STORAGE_USER_KEY = "cricket_booking_user";

function readStoredUser() {
  const raw = localStorage.getItem(STORAGE_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  const saveSession = (nextToken: string, nextUser: User) => {
    localStorage.setItem(STORAGE_TOKEN_KEY, nextToken);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearSession = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    setToken(null);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const response = await apiRequest<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password }
    });

    saveSession(response.token, response.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await apiRequest<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: { name, email, password }
    });

    saveSession(response.token, response.user);
  };

  const logout = async () => {
    if (token) {
      await apiRequest<{ message: string }>("/auth/logout", {
        method: "POST",
        token
      }).catch(() => undefined);
    }

    clearSession();
  };

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      register,
      logout
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
