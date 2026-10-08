import { useEffect, useState } from 'react';
import { useUi } from '../store/ui';

/**
 * System-Modus: eine Theme-Wahl des Hosts (data-theme am Root-Element, z. B. im
 * claude.ai-Viewer) hat Vorrang, sonst gilt prefers-color-scheme.
 */
function systemDark(): boolean {
  const host = document.documentElement.dataset.theme;
  if (host === 'dark') return true;
  if (host === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Aktiver Farbmodus (Theme-Einstellung oder System). */
export function useIsDark(): boolean {
  const theme = useUi((s) => s.theme);
  const [sysDark, setSysDark] = useState(systemDark);
  useEffect(() => {
    const update = () => setSysDark(systemDark());
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener('change', update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq?.removeEventListener('change', update);
      mo.disconnect();
    };
  }, []);
  return theme === 'dark' || (theme === 'system' && sysDark);
}
