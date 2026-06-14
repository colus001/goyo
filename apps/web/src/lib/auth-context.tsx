'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authLogout, authMe } from './api';
import type { CloudUser } from './types';

interface AuthContextValue {
  isLoading: boolean;
  logout: () => void;
  setUser: (user: CloudUser | null) => void;
  user: CloudUser | null;
}

const AuthContext = createContext<AuthContextValue>({
  isLoading: true,
  logout: () => {},
  setUser: () => {},
  user: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void authMe()
      .then((result) => {
        if (result.ok && result.user) {
          setUser(result.user);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const logout = useCallback(() => {
    void authLogout().then(() => setUser(null));
  }, []);

  return (
    <AuthContext.Provider value={{ isLoading, logout, setUser, user }}>
      {children}
    </AuthContext.Provider>
  );
}
