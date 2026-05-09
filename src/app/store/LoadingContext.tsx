import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  persistent?: boolean;
}

interface LoadingContextValue {
  showLoading: (message?: string, persistent?: boolean) => void;
  hideLoading: () => void;
  loadingState: LoadingState;
  showPageLoader: (message?: string) => void;
  hidePageLoader: () => void;
  pageLoader: LoadingState;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false });
  const [pageLoader, setPageLoader] = useState<LoadingState>({ isLoading: false });
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showLoading = useCallback((message?: string, persistent = false) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setLoadingState({ isLoading: true, message, persistent });
  }, []);

  const hideLoading = useCallback(() => {
    if (!loadingState.persistent) {
      setLoadingState({ isLoading: false });
    }
  }, [loadingState.persistent]);

  const showPageLoader = useCallback((message?: string) => {
    setPageLoader({ isLoading: true, message });
  }, []);

  const hidePageLoader = useCallback(() => {
    setPageLoader({ isLoading: false });
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        showLoading,
        hideLoading,
        loadingState,
        showPageLoader,
        hidePageLoader,
        pageLoader,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return ctx;
}

export function usePageLoader(message?: string) {
  const { showPageLoader, hidePageLoader } = useLoading();
  
  useEffect(() => {
    if (message) {
      showPageLoader(message);
    }
    return () => {
      hidePageLoader();
    };
  }, [message, showPageLoader, hidePageLoader]);
}