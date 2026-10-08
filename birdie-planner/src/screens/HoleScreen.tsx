import { db } from '../db/db';
import { saveHoleScore } from '../db/actions';
import { useActiveRound } from '../db/hooks';
import { ForecastBar } from '../components/ForecastBar';
import { Banner, StrokeDots } from '../components/ui';
import { useRoundModel } from '../hooks/useRoundModel';
import { fmt1, pluralLoch } from '../lib/format';
import { netLabel, pointsLabel, strokesLabel } from '../lib/labels';
import { useUi } from '../store/ui';
import { StartRoundScreen } from './StartRoundScreen';

export function HoleScreen() {
  const round = useActiveRound();
  const model = useRoundModel(round);
  const { holeIndex, setHole, go, forecastMode, setForecastMode } = useUi();

  if (round === undefined) return null;
  if (round === null) return <StartRoundScreen />;
  if (!model) return <Banner tone="error">Platz oder Tee der Runde nicht gefunden.</Banner>;

  const i = Math.min(Math.max(holeIndex, 0), model.ev.lines.length - 1);
  const line = model.ev.lines[i]!;
  const saved = line.gross;
  const shown = saved === undefined ? line.par : saved;
  const save = (v: number | null | undefined) => round.id !== undefined && void saveHoleScore(db, round.id, line.no, v);
  const bump = (d: number) => save(Math.min(20, Math.max(1, (typeof shown === 'number' ? shown : line.par) + d)));
  const isLast = i === model.ev.lines.length - 1;
  const next = () => {
    if (saved === undefined) save(line.par);
    if (isLast) go('finish');
    else setHole(i + 1);
  };

  const planHole = model.plan?.plan.find((p) => p.no === line.no);
  const plan = model.plan;

  return (
    <div className="flex flex-col gap-3">
      {/* Kopf: Lochinfo */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold muted">Loch {line.no} / {model.ev.lines.length}</div>
          <div className="text-3xl font-black">Par {line.par} <span className="text-lg font-semibold muted">· SI {line.si}</span></div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <StrokeDots n={line.strokes} /> <span>{strokesLabel(line.strokes)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold uppercase muted">Punkte gesamt</div>
          <div className="text-3xl font-black tabular-nums">{model.ev.points}</div>
          <div className="text-xs muted">nach {pluralLoch(model.ev.lines.length - model.ev.missing)}</div>
        </div>
      </div>

      <ForecastBar forecasts={model.forecasts} mode={forecastMode} onMode={setForecastMode} />

      {/* Ziel-Modus */}
      {model.solver && !model.solver.reachable && <Banner tone="error">{model.solver.warning}</Banner>}
      {plan && (
        <div className="rounded-xl border-2 border-sky-600 bg-sky-50 p-3 dark:bg-sky-950">
          {planHole ? (
            <div className="text-lg font-bold">
              Plan Loch {planHole.no}: {planHole.targetGross} Schläge = {netLabel(planHole.targetPoints)} = {pointsLabel(planHole.targetPoints)}
            </div>
          ) : (
            <div className="text-lg font-bold">Loch gespielt – Plan für die Restlöcher siehe Ziel-Tab</div>
          )}
          <div className="text-sm">
            {plan.done
              ? `Ziel ${fmt1(model.round.targetHcpi)} erreicht – der Rest darf 0 Punkte bringen.`
              : `Du brauchst noch ${plan.remainingNeeded} Punkte auf ${pluralLoch(plan.remainingHoles)} = Ø ${fmt1(plan.avgPerHole)} pro Loch`}
          </div>
          {!plan.feasible && <div className="text-sm font-semibold text-red-700 dark:text-red-400">Mit den Restlöchern nicht mehr erreichbar.</div>}
          {plan.feasible && plan.unrealistic && <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">Nur noch mit Netto-Albatros möglich – sehr unrealistisch.</div>}
        </div>
      )}

      {/* Große Schlagzahl */}
      <div className="flex items-center justify-between gap-3">
        <button className="btn-secondary h-24 w-24 shrink-0 text-5xl" aria-label="einen Schlag weniger" onClick={() => bump(-1)}>−</button>
        <div className="flex-1 text-center" aria-live="polite">
          <div className={`text-8xl font-black tabular-nums leading-none ${saved === undefined ? 'text-neutral-400 dark:text-neutral-600' : ''}`}>
            {shown === null ? '—' : shown}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {saved === undefined
              ? 'noch nicht erfasst'
              : saved === null
                ? 'Strich · 0 Punkte'
                : `${pointsLabel(line.points ?? 0)} · ${netLabel(line.points ?? 0)}`}
          </div>
        </div>
        <button className="btn-secondary h-24 w-24 shrink-0 text-5xl" aria-label="einen Schlag mehr" onClick={() => bump(1)}>+</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button className="btn-secondary min-h-[56px]" onClick={() => save(line.par)}>Par</button>
        <button className="btn-secondary min-h-[56px]" onClick={() => save(line.par + 1)}>Bogey</button>
        <button className="btn-secondary min-h-[56px]" onClick={() => save(null)}>Strich</button>
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <button className="btn-secondary min-h-[64px]" disabled={i === 0} onClick={() => setHole(i - 1)}>← {i > 0 ? i : ''}</button>
        <button className="btn-primary min-h-[64px] text-lg" onClick={next}>
          {saved === undefined ? `${line.par} speichern · ` : ''}
          {isLast ? 'Abschluss' : `Loch ${line.no + 1} →`}
        </button>
      </div>
      {saved !== undefined && (
        <button className="text-sm underline muted" onClick={() => save(undefined)}>Eingabe für Loch {line.no} löschen</button>
      )}
      {!model.tee.holesVerified && (
        <Banner tone="warn">Lochdaten sind Platzhalter – bitte mit der Scorekarte abgleichen (Setup).</Banner>
      )}
    </div>
  );
}
