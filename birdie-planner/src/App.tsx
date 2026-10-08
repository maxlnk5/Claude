import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useActiveRound, useProfile } from './db/hooks';
import { useIsDark } from './hooks/useIsDark';
import { fmtHcpi } from './lib/format';
import { FinishScreen } from './screens/FinishScreen';
import { HoleScreen } from './screens/HoleScreen';
import { ScorecardScreen } from './screens/ScorecardScreen';
import { SetupScreen } from './screens/SetupScreen';
import { StartRoundScreen } from './screens/StartRoundScreen';
import { TargetScreen } from './screens/TargetScreen';
import { useUi, type Screen } from './store/ui';
import { DialogHost } from './components/DialogHost';

// Recharts nur laden, wenn der Verlauf geöffnet wird
const HistoryScreen = lazy(() => import('./screens/HistoryScreen').then((m) => ({ default: m.HistoryScreen })));

const NAV: Array<{ id: Screen; label: string; icon: string; match: Screen[] }> = [
  { id: 'hole', label: 'Runde', icon: '⛳', match: ['hole', 'start', 'finish'] },
  { id: 'card', label: 'Karte', icon: '▦', match: ['card'] },
  { id: 'target', label: 'Ziel', icon: '◎', match: ['target'] },
  { id: 'history', label: 'Verlauf', icon: '↗', match: ['history'] },
  { id: 'setup', label: 'Setup', icon: '⚙', match: ['setup'] },
];

function Main({ screen }: { screen: Screen }): ReactNode {
  switch (screen) {
    case 'start': return <StartRoundScreen />;
    case 'hole': return <HoleScreen />;
    case 'card': return <ScorecardScreen />;
    case 'target': return <TargetScreen />;
    case 'finish': return <FinishScreen />;
    case 'history': return <Suspense fallback={<p className="muted">Lade …</p>}><HistoryScreen /></Suspense>;
    case 'setup': return <SetupScreen />;
  }
}

export function App() {
  const { screen, go, viewRound } = useUi();
  const profile = useProfile();
  const active = useActiveRound();
  const dark = useIsDark();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0a0a' : '#14532d');
  }, [dark]);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-neutral-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="text-lg font-black tracking-tight">Birdie Planner</div>
        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase muted">HCPI</div>
          <div className="text-xl font-black tabular-nums leading-none">{fmtHcpi(profile?.hcpi)}</div>
        </div>
      </header>
      <main className="flex-1 px-4 pb-28 pt-4">
        <Main screen={screen} />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Hauptnavigation"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map((n) => {
            const on = n.match.includes(screen);
            return (
              <button
                key={n.id}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 text-xs font-semibold ${on ? 'text-green-800 dark:text-green-400' : 'muted'}`}
                aria-current={on ? 'page' : undefined}
                onClick={() => {
                  if (n.id === 'card') viewRound(null);
                  go(n.id === 'hole' && !active ? 'start' : n.id);
                }}
              >
                <span className="text-2xl leading-none" aria-hidden>{n.icon}</span>
                {n.label}
              </button>
            );
          })}
        </div>
      </nav>
      <DialogHost />
    </div>
  );
}
