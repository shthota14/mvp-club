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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    setUser(null);
    setIdeas([]);
    setActiveIdea(null);
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
