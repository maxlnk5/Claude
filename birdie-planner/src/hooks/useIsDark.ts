import { useEffect, useState } from 'react';
import { useUi } from '../store/ui';

/** Aktiver Farbmodus (Theme-Einstellung oder System). */
export function useIsDark(): boolean {
  const theme = useUi((s) => s.theme);
  const [sysDark, setSysDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return theme === 'dark' || (theme === 'system' && sysDark);
}
