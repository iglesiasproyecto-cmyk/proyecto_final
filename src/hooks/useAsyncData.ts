import { useState, useEffect, useCallback } from 'react';

interface UseAsyncDataOptions<T> {
  initialData?: T;
  enabled?: boolean;
}

interface UseAsyncDataResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataResult<T> {
  const { initialData, enabled = true } = options;
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, enabled]);

  useEffect(() => {
    if (enabled) {
      refetch();
    }
  }, [refetch, enabled]);

  return { data, isLoading, error, refetch };
}

interface UseDelayedLoadingOptions {
  delay?: number;
  minDuration?: number;
}

export function useDelayedLoading(
  isLoading: boolean,
  options: UseDelayedLoadingOptions = {}
): boolean {
  const { delay = 200, minDuration = 400 } = options;
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let minDurationTimeout: ReturnType<typeof setTimeout>;

    if (isLoading) {
      timeoutId = setTimeout(() => {
        setShowLoading(true);
      }, delay);

      minDurationTimeout = setTimeout(() => {
        setShowLoading(false);
      }, delay + minDuration);
    } else {
      setShowLoading(false);
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(minDurationTimeout);
    };
  }, [isLoading, delay, minDuration]);

  return showLoading;
}

export function useStaggeredLoading(items: unknown[], staggerMs = 50): boolean {
  const [isStaggering, setIsStaggering] = useState(true);

  useEffect(() => {
    if (!items || items.length === 0) {
      setIsStaggering(false);
      return;
    }

    const timeout = setTimeout(() => {
      setIsStaggering(false);
    }, items.length * staggerMs);

    return () => clearTimeout(timeout);
  }, [items, staggerMs]);

  return isStaggering;
}