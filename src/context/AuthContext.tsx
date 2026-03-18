import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Octokit } from '@octokit/rest';
import type { AuthState, AuthMethod, GitHubUser } from '../types';
import { initOctokit, clearOctokit } from '../lib/github';

interface AuthContextValue {
  auth: AuthState;
  login: (token: string, method: AuthMethod) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_TOKEN_KEY = 'ab-dashboard-token';
const STORAGE_METHOD_KEY = 'ab-dashboard-auth-method';

async function fetchUser(token: string): Promise<GitHubUser> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.users.getAuthenticated();
  return {
    login: data.login,
    avatarUrl: data.avatar_url,
    name: data.name ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    method: null,
    user: null,
  });
  const [initializing, setInitializing] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const method = localStorage.getItem(STORAGE_METHOD_KEY) as AuthMethod | null;
    if (token && method) {
      fetchUser(token)
        .then((user) => {
          initOctokit(token);
          setAuth({ isAuthenticated: true, token, method, user });
        })
        .catch(() => {
          // Token expired or invalid — clear it
          localStorage.removeItem(STORAGE_TOKEN_KEY);
          localStorage.removeItem(STORAGE_METHOD_KEY);
        })
        .finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, []);

  const login = useCallback(async (token: string, method: AuthMethod) => {
    const user = await fetchUser(token);
    initOctokit(token);
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_METHOD_KEY, method);
    setAuth({ isAuthenticated: true, token, method, user });
  }, []);

  const logout = useCallback(() => {
    clearOctokit();
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_METHOD_KEY);
    setAuth({ isAuthenticated: false, token: null, method: null, user: null });
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
