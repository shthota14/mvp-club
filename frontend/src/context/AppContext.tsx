import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Idea } from '@/types';
import { authApi, ideasApi } from '@/api/client';

interface AppContextValue {
  user: User | null;
  ideas: Idea[];
  activeIdea: Idea | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshIdeas: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setActiveIdea: (idea: Idea) => void;
  isImpersonating: boolean;
  impersonate: (token: string, user: User) => void;
  stopImpersonating: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    setIsImpersonating(!!localStorage.getItem('mvpclub_admin_token'));
    const token = localStorage.getItem('mvpclub_token');
    if (!token) { setIsLoading(false); return; }

    authApi.me()
      .then((res) => {
        setUser(res.data.user);
        return ideasApi.list();
      })
      .then((res) => {
        const ideaList: Idea[] = res.data.ideas;
        setIdeas(ideaList);
        setActiveIdea(ideaList.find((i) => i.is_active) ?? ideaList[0] ?? null);
      })
      .catch(() => localStorage.removeItem('mvpclub_token'))
      .finally(() => setIsLoading(false));
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('mvpclub_token', token);
    setUser(userData);
    refreshIdeas();
  };

  const logout = () => {
    localStorage.removeItem('mvpclub_token');
    localStorage.removeItem('mvpclub_admin_token');
    setIsImpersonating(false);
    setUser(null);
    setIdeas([]);
    setActiveIdea(null);
  };

  // Admin "view as user": stash the admin's own token so it can be restored,
  // then swap in the short-lived impersonation token from POST
  // /admin/users/:id/impersonate.
  const impersonate = (token: string, userData: User) => {
    const currentToken = localStorage.getItem('mvpclub_token');
    if (currentToken) localStorage.setItem('mvpclub_admin_token', currentToken);
    localStorage.setItem('mvpclub_token', token);
    setUser(userData);
    setIsImpersonating(true);
    refreshIdeas();
  };

  const stopImpersonating = async () => {
    const adminToken = localStorage.getItem('mvpclub_admin_token');
    if (!adminToken) return;
    localStorage.setItem('mvpclub_token', adminToken);
    localStorage.removeItem('mvpclub_admin_token');
    setIsImpersonating(false);
    try {
      const res = await authApi.me();
      setUser(res.data.user);
      await refreshIdeas();
    } catch {
      logout();
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      setUser(res.data.user);
    } catch { /* silently fail */ }
  };

  const refreshIdeas = async () => {
    try {
      const res = await ideasApi.list();
      const ideaList: Idea[] = res.data.ideas;
      setIdeas(ideaList);
      setActiveIdea(ideaList.find((i) => i.is_active) ?? ideaList[0] ?? null);
    } catch {
      // silently fail
    }
  };

  return (
    <AppContext.Provider value={{
      user, ideas, activeIdea, isLoading,
      isAuthenticated: !!user,
      login, logout, refreshIdeas, refreshUser, setActiveIdea,
      isImpersonating, impersonate, stopImpersonating,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
