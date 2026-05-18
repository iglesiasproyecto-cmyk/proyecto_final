import { useEffect, useState } from 'react';

/**
 * Delays rendering of background animations until after main content paints.
 * Improves FCP/LCP by deferring expensive animations.
 * @param delayMs - Delay in milliseconds before enabling rendering
 * @param enabled - Whether to enable this optimization (default: true)
 */
export function useBackgroundAnimation(delayMs: number = 100, enabled: boolean = true) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setShouldRender(true);
      return;
    }

    // Use requestAnimationFrame to align with paint timing
    const rafId = requestAnimationFrame(() => {
      const timerId = setTimeout(() => {
        setShouldRender(true);
      }, delayMs);

      return () => clearTimeout(timerId);
    });

    return () => cancelAnimationFrame(rafId);
  }, [delayMs, enabled]);

  return shouldRender;
}
