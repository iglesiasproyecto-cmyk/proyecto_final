import React, { createContext, useState, ReactNode } from 'react';

// Define a type for the context value if needed
interface AppContextProps {
  // Example state value
  example: string;
  setExample: (value: string) => void;
}

// Create the context with a default undefined (to enforce provider usage)
export const AppContext = createContext<AppContextProps | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [example, setExample] = useState('default');

  const value: AppContextProps = {
    example,
    setExample,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};


