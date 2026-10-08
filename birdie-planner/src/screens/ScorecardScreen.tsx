import { db } from '../db/db';
import { saveHoleScore } from '../db/actions';
import { useActiveRound, useRound } from '../db/hooks';
import { Banner, Stat } from '../components/ui';
import { useRoundModel } from '../hooks/useRoundModel';
import { fmt1, fmtDate, fmtHcpi } from '../lib/format';
import type { HoleLine } from '../lib/whs';
import { useUi } from '../store/ui';

function Sum({ label, lines }: { label: string; lines: HoleLine[] }) {
  const par = lines.reduce((s, l) => s + l.par, 0);
  const gross = lines.reduce((s, l) => s + (typeof l.gross === 'number' ? l.gross : 0), 0);
  const pts = lines.reduce((s, l) => s + (l.points ?? 0), 0);
  return (
    <tr className="bg-neutral-100 font-bold dark:bg-neutral-800">
      <td className="table-cell text-left">{label}</td>
      <td className="table-cell">{par}</td>
      <td className="table-cell" />
      <td className="table-cell" />
      <td className="table-cell">{gross || '–'}</td>
      <td className="table-cell">{pts}</td>
    </tr>
  );
}

export function ScorecardScreen() {
  const { viewRoundId, viewRound, go, setHole } = useUi();
  const active = useActiveRound();
  const viewed = useRound(viewRoundId);
  const round = viewRoundId !== null ? viewed : active;
  const model = useRoundModel(round);

  if (round === undefined || active === undefined) return null;
  if (!round) {
    return (
      <div className="space-y-3">
        <Banner tone="info">Keine laufende Runde.</Banner>
        <button className="btn-primary w-full" onClick={() => go('start')}>Runde starten</button>
      </div>
    );
  }
  if (!model) return <Banner tone="error">Platz oder Tee der Runde nicht gefunden.</Banner>;

  const editable = round.status === 'active';
  const lines = model.ev.lines;
  const planBy = new Map(model.plan?.plan.map((p) => [p.no, p]) ?? []);
  const fc = model.forecasts[0];

  const row = (l: HoleLine, idx: number) => {
    const p = planBy.get(l.no);
    return (
      <tr key={l.no}>
        <td className="table-cell text-left font-bold">
          {editable ? (
            <button className="underline-offset-2 hover:underline" onClick={() => { setHole(idx); go('hole'); }}>{l.no}</button>
          ) : l.no}
        </td>
        <td className="table-cell">{l.par}</td>
        <td className="table-cell muted">{l.si}</td>
        <td className="table-cell">{l.strokes || ''}</td>
        <td className="table-cell">
          {editable ? (
            <select
              aria-label={`Brutto Loch ${l.no}`}
              className="w-20 px-1 py-1 text-center"
              value={l.gross === undefined ? '' : l.gross === null ? 'x' : String(l.gross)}
              onChange={(e) => {
                const v = e.target.value;
                if (round.id !== undefined) void saveHoleScore(db, round.id, l.no, v === '' ? undefined : v === 'x' ? null : Number(v));
              }}
            >
              <option value="">–</option>
              {Array.from({ length: 15 }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="x">Strich</option>
            </select>
          ) : l.gross === undefined ? '–' : l.gross === null ? '—' : l.gross}
        </td>
        <td className="table-cell font-semibold">
          {l.points ?? (p ? <span className="text-sky-700 dark:text-sky-400">{p.targetGross}/{p.targetPoints}P</span> : '')}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-black">{model.course.name} · {model.tee.name}</h1>
        <span className="text-sm muted">{fmtDate(round.date)}</span>
      </div>
      <div className="card grid grid-cols-4 gap-2">
        <Stat label="Punkte" value={model.ev.points} />
        <Stat label="AGS" value={model.ev.ags} />
        <Stat label="SD" value={fmt1(round.status === 'finished' ? round.sdFinal : model.ev.sd)} />
        <Stat
          label={round.status === 'finished' ? 'HCPI neu' : 'Prognose'}
          value={fmtHcpi(round.status === 'finished' ? round.hcpiAfter : fc?.hcpi)}
        />
      </div>
      {model.ev.missing > 0 && editable && (
        <p className="text-sm muted">AGS/SD rechnen offene Löcher als Netto-Doppelbogey. Blau = Plan (Schläge/Punkte).</p>
      )}
      <div className="card overflow-x-auto p-2">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-xs uppercase muted">
              <th className="table-cell text-left">Loch</th>
              <th className="table-cell">Par</th>
              <th className="table-cell">SI</th>
              <th className="table-cell">Vg</th>
              <th className="table-cell">Brutto</th>
              <th className="table-cell">Pkt</th>
            </tr>
          </thead>
          <tbody>
            {lines.slice(0, 9).map((l, k) => row(l, k))}
            <Sum label="Out" lines={lines.slice(0, 9)} />
            {lines.slice(9).map((l, k) => row(l, k + 9))}
            <Sum label="In" lines={lines.slice(9)} />
            <Sum label="Gesamt" lines={lines} />
          </tbody>
        </table>
      </div>
      {editable ? (
        <button className="btn-primary min-h-[56px] w-full" onClick={() => go('finish')}>Runde abschließen</button>
      ) : (
        <button className="btn-secondary w-full" onClick={() => { viewRound(null); go('history'); }}>Zurück zum Verlauf</button>
      )}
    </div>
  );
}
