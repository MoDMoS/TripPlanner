import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type User = {
  id: string;
  email: string;
  name: string;
  roles?: string[];
  permissions?: string[];
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  hasTripAccess: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } catch {
      /* ignore */
    }
    setUser(null);
    window.location.assign('/');
  }

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as User;
      })
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const hasTripAccess = Boolean(
    user?.permissions?.includes('service:trip-planner') ||
      user?.permissions?.includes('admin:access'),
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      hasTripAccess,
      logout: () => logout(),
    }),
    [user, loading, hasTripAccess],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
