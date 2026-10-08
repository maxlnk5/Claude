import { useState } from 'react';
import { db } from '../db/db';
import { downloadJson, finishRound } from '../db/actions';
import { useActiveRound } from '../db/hooks';
import { Banner, Card, DISCLAIMER, IntInput, Stat } from '../components/ui';
import { useRoundModel } from '../hooks/useRoundModel';
import { fmt1, fmtDelta, fmtHcpi } from '../lib/format';
import { round1 } from '../lib/whs';
import { useUi } from '../store/ui';

export function FinishScreen() {
  const round = useActiveRound();
  const model = useRoundModel(round);
  const { go } = useUi();
  const [addToRecord, setAddToRecord] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (round === undefined) return null;
  if (!round) {
    return (
      <div className="space-y-3">
        <Banner tone="info">Keine laufende Runde.</Banner>
        <button className="btn-secondary w-full" onClick={() => go('history')}>Zum Verlauf</button>
      </div>
    );
  }
  if (!model) return <Banner tone="error">Platz oder Tee der Runde nicht gefunden.</Banner>;
  const { ev } = model;
  const r = ev.result;
  const delta = r.hcpi === null ? null : round1(r.hcpi - round.hcpiBefore);

  const exportRound = () =>
    downloadJson(`runde-${round.date}.json`, {
      round,
      course: model.course.name,
      tee: model.tee,
      result: { gross: ev.gross, points: ev.points, ags: ev.ags, sd: ev.sd, sdAdjusted: r.newSdAdjusted, exsc: r.exsc, hcpiBefore: round.hcpiBefore, hcpiAfter: r.hcpi },
      lines: ev.lines,
      note: DISCLAIMER,
    });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await finishRound(db, round, model.course, model.tee, addToRecord);
      go('history');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Rundenabschluss">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Brutto" value={ev.gross} />
          <Stat label="Punkte" value={ev.points} />
          <Stat label="AGS" value={ev.ags} />
          <Stat label="SD" value={fmt1(ev.sd)} sub={r.exsc !== 0 ? `inkl. ExSc: ${fmt1(r.newSdAdjusted)}` : undefined} />
          <Stat label="HCPI vorher" value={fmtHcpi(round.hcpiBefore)} />
          <Stat label="HCPI neu" value={fmtHcpi(r.hcpi)} sub={fmtDelta(delta)} big />
        </div>
        <div className="mt-3 space-y-2">
          {r.exsc !== 0 && (
            <Banner tone="ok">
              Exceptional Score: {r.exsc} auf diese Runde und die 19 vorherigen SD (Diff {fmt1(round.hcpiBefore - ev.sd)}).
            </Banner>
          )}
          {r.softCap && <Banner tone="info">Soft Cap aktiv{r.hardCap ? ', Hard Cap aktiv' : ''}.</Banner>}
          {ev.missing > 0 && (
            <Banner tone="warn">{ev.missing} Loch/Löcher ohne Score – zählen als Netto-Doppelbogey.</Banner>
          )}
          {ev.picked > 0 && <Banner tone="info">{ev.picked} Strich(e) – zählen als Netto-Doppelbogey.</Banner>}
          {r.hcpi === null && <Banner tone="warn">Weniger als 3 Scores – noch kein Index berechenbar.</Banner>}
        </div>
      </Card>
      <Card>
        <div className="grid grid-cols-2 items-end gap-3">
          <label className="block">
            <span className="label">PCC des Tages</span>
            <IntInput value={round.pcc} min={-1} max={3} onChange={(v) => round.id !== undefined && void db.rounds.update(round.id, { pcc: v ?? 0 })} />
          </label>
          <p className="text-xs muted">Der PCC steht erst nach dem Spieltag fest (golf.de). Änderung rechnet sofort neu.</p>
        </div>
        <label className="mt-3 flex items-center gap-3">
          <input type="checkbox" className="h-7 w-7" checked={addToRecord} onChange={(e) => setAddToRecord(e.target.checked)} />
          <span>Inoffiziell in den Scoring Record übernehmen und Profil-HCPI aktualisieren</span>
        </label>
      </Card>
      <Banner tone="warn"><b>{DISCLAIMER}</b></Banner>
      {error && <Banner tone="error">{error}</Banner>}
      <div className="grid gap-2">
        <button className="btn-primary min-h-[64px] text-lg" disabled={busy} onClick={() => void save()}>Runde lokal speichern</button>
        <button className="btn-secondary" onClick={exportRound}>Als JSON exportieren</button>
        <button className="btn-secondary" onClick={() => go('card')}>Zurück zur Scorekarte</button>
      </div>
    </div>
  );
}
