import { useEffect, useState } from 'react';
import { AuthContext, AuthUser } from './AuthContext';

const SESSION_USER_KEY = 'gestion_tickets_user';

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<AuthUser>;
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.nombre === 'string' &&
    (user.rol === 'Admin' || user.rol === 'Usuario')
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem(SESSION_USER_KEY);
      if (!storedUser) return;

      const parsedUser = JSON.parse(storedUser);
      if (isAuthUser(parsedUser)) {
        setUser(parsedUser);
      } else {
        sessionStorage.removeItem(SESSION_USER_KEY);
      }
    } catch {
      sessionStorage.removeItem(SESSION_USER_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (user: AuthUser) => {
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
