import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

// Define a type for the context value if needed
interface AppContextProps {
  // Example state value
  example: string;
  setExample: (value: string) => void;
  user: User | null;
  loading: boolean;
}

// Hook para acceder al contexto
export const useAuth = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAuth must be used within an AppProvider');
  }
  return { user: context.user, loading: context.loading };
}

// Create the context with a default undefined (to enforce provider usage)
export const AppContext = createContext<AppContextProps | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [example, setExample] = useState('default');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: AppContextProps = {
    example,
    setExample,
    user,
    loading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};


