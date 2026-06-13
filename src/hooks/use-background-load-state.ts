'use client';

import { useCallback, useRef, useState } from 'react';

interface BeginLoadOptions {
  background?: boolean;
}

/**
 * Separates first-load skeleton from silent background refreshes.
 * After the first successful load, subsequent fetches only set `refreshing`.
 */
export function useBackgroundLoadState() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);

  const beginLoad = useCallback((options?: BeginLoadOptions) => {
    const isBackground = Boolean(options?.background && hasLoadedOnce.current);
    if (isBackground) {
      setRefreshing(true);
    } else if (!hasLoadedOnce.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    return isBackground;
  }, []);

  const endLoad = useCallback(() => {
    hasLoadedOnce.current = true;
    setInitialLoading(false);
    setRefreshing(false);
  }, []);

  return { initialLoading, refreshing, beginLoad, endLoad, hasLoadedOnce };
}
