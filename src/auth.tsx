import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, setUnauthorizedHandler, type User, P } from "./api";

// Set to false when ready to re-enable authentication/login screen
export const BYPASS_AUTH = false;

export const DEFAULT_DEV_USER: User = {
  id: 1,
  email: "admin@watercare.local",
  full_name: "Admin User",
  role: "admin",
  is_active: true,
  permissions: Object.values(P),
};

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (...perms: string[]) => boolean; // true if the user has ANY of the permissions
}
const Ctx = createContext<AuthState>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(BYPASS_AUTH ? DEFAULT_DEV_USER : null);
  const [loading, setLoading] = useState(BYPASS_AUTH ? false : !!getToken());

  const logout = useCallback(() => {
    setToken(null);
    setUser(BYPASS_AUTH ? DEFAULT_DEV_USER : null);
  }, []);

  useEffect(() => {
    if (BYPASS_AUTH) {
      if (!getToken()) {
        // Silently attempt login with backend default admin credentials if backend is running
        api.login("admin@yourcompany.com", "ChangeMe123!")
          .then(({ access_token }) => {
            setToken(access_token);
            return api.get<User>("/auth/me");
          })
          .then((u) => setUser(u))
          .catch(() => {
            // Backend offline or custom credentials; keep default dev user
          });
      } else {
        api.get<User>("/auth/me").then(setUser).catch(() => {});
      }
      return;
    }
    setUnauthorizedHandler(logout);
    if (getToken()) api.get<User>("/auth/me").then(setUser).catch(logout).finally(() => setLoading(false));
  }, [logout]);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.login(email, password);
    setToken(access_token);
    setUser(await api.get<User>("/auth/me"));
  };

  const can = (...perms: string[]) =>
    BYPASS_AUTH || (!!user && (user.role === "admin" || perms.some((p) => user.permissions.includes(p))));

  return <Ctx.Provider value={{ user, loading, login, logout, can }}>{children}</Ctx.Provider>;
}
