'use client';

import { useCallback, useState } from 'react';

interface ProgressState {
  open: boolean;
  title: string;
  description?: string;
}

const initialState: ProgressState = { open: false, title: '' };

/** Runs async actions with a blocking progress dialog. */
export function useProgressAction() {
  const [progress, setProgress] = useState<ProgressState>(initialState);

  const run = useCallback(
    async <T,>(
      title: string,
      action: () => Promise<T>,
      description?: string,
    ): Promise<T> => {
      setProgress({ open: true, title, description });
      try {
        return await action();
      } finally {
        setProgress(initialState);
      }
    },
    [],
  );

  return { progress, run };
}
