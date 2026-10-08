import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ForecastMode } from '../lib/whs';

export type Screen = 'start' | 'hole' | 'card' | 'target' | 'finish' | 'history' | 'setup';
export type Theme = 'system' | 'light' | 'dark';

interface UiState {
  screen: Screen;
  holeIndex: number;
  forecastMode: ForecastMode;
  theme: Theme;
  /** Runde, die in der Scorekarte angezeigt wird (null = aktive Runde) */
  viewRoundId: number | null;
  go: (s: Screen) => void;
  setHole: (i: number) => void;
  setForecastMode: (m: ForecastMode) => void;
  setTheme: (t: Theme) => void;
  viewRound: (id: number | null) => void;
}

// localStorage nur für Komfort-Einstellungen; scheitert der Zugriff, gilt der Default.
const safeStorage = createJSONStorage(() => {
  try {
    const s = window.localStorage;
    s.getItem('x');
    return s;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      screen: 'start',
      holeIndex: 0,
      forecastMode: 'netPar',
      theme: 'system',
      viewRoundId: null,
      go: (screen) => set({ screen }),
      setHole: (holeIndex) => set({ holeIndex }),
      setForecastMode: (forecastMode) => set({ forecastMode }),
      setTheme: (theme) => set({ theme }),
      viewRound: (viewRoundId) => set({ viewRoundId }),
    }),
    {
      name: 'birdie-ui',
      storage: safeStorage,
      partialize: (s) => ({ forecastMode: s.forecastMode, theme: s.theme, holeIndex: s.holeIndex }),
    },
  ),
);
