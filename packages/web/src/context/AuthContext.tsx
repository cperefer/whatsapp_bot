import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError } from "../api/client.js";
import { getMe, type User } from "../api/auth.js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((res) => setUserState(res.user))
      .catch((err) => {
        if (!(err instanceof ApiError && err.code === "unauthorized")) {
          console.error("No se pudo comprobar la sesión", err);
        }
        setUserState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    setUser: (nextUser) => setUserState(nextUser),
    clearUser: () => setUserState(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
