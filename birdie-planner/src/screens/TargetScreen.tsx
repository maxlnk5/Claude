import { useEffect, useMemo, useState } from 'react';
import { db } from '../db/db';
import { useActiveRound, useCourses, useProfile, useRecords, useRounds } from '../db/hooks';
import { PlanTable } from '../components/PlanTable';
import { Banner, Card, DecimalInput, Field, Stat } from '../components/ui';
import { useRoundModel } from '../hooks/useRoundModel';
import { capLowHcpi, historySds, holeStatsFor } from '../lib/derived';
import { fmt1, fmtHcpi } from '../lib/format';
import type { Round } from '../lib/types';
import { courseHandicap, planHoles, round1, solveTarget, strokeAllocation } from '../lib/whs';

export function TargetScreen() {
  const active = useActiveRound();
  const profile = useProfile();
  const courses = useCourses();
  const records = useRecords();
  const rounds = useRounds();
  const activeModel = useRoundModel(active);
  const [target, setTarget] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [teeName, setTeeName] = useState('');

  useEffect(() => {
    if (target === null && profile) setTarget(active?.targetHcpi ?? round1(profile.hcpi - 1));
  }, [profile, active, target]);
  useEffect(() => {
    if (active) {
      setCourseId(active.courseId);
      setTeeName(active.tee);
    } else if (courses?.length && courseId === null) {
      setCourseId(courses[0]?.id ?? null);
      setTeeName(courses[0]?.tees[0]?.name ?? '');
    }
  }, [active, courses, courseId]);

  const course = courses?.find((c) => c.id === courseId);
  const tee = course?.tees.find((t) => t.name === teeName) ?? course?.tees[0];

  const calc = useMemo(() => {
    if (!profile || !records || !rounds || !tee || target === null) return null;
    const history = historySds(records);
    const hcpiBefore = active?.hcpiBefore ?? profile.hcpi;
    const pcc = active?.pcc ?? 0;
    const ch = courseHandicap(hcpiBefore, tee.slope, tee.cr, tee.par);
    const lowHcpi = capLowHcpi(profile, records);
    const base = { history, hcpiBefore, lowHcpi, cr: tee.cr, slope: tee.slope, par: tee.par, pcc, ch };
    const solver = solveTarget({ ...base, targetHcpi: target });
    const strokes = strokeAllocation(ch, tee.holes.map((h) => h.si));
    const lines = activeModel?.ev.lines;
    const stats = course?.id !== undefined ? holeStatsFor(rounds, course.id, tee) : null;
    const plan =
      solver.reachable && solver.requiredPoints !== null
        ? planHoles(
            tee.holes.map((h, i) => ({
              no: h.no,
              par: h.par,
              si: h.si,
              strokes: strokes[i] ?? 0,
              points: lines?.[i]?.indexPoints ?? undefined,
            })),
            solver.requiredPoints,
            stats,
          )
        : null;
    // Schnellübersicht verschiedener Ziele
    const steps = [0.1, 0.3, 0.5, 1, 1.5, 2, 3].map((d) => {
      const t = round1(hcpiBefore - d);
      const s = solveTarget({ ...base, targetHcpi: t });
      return { t, s };
    });
    return { solver, plan, steps, ch, hcpiBefore };
  }, [profile, records, rounds, tee, target, active, activeModel, course]);

  if (!profile || !courses) return null;

  const setRoundTarget = (r: Round, t: number | null) => r.id !== undefined && void db.rounds.update(r.id, { targetHcpi: t });

  return (
    <div className="space-y-4">
      <Card title="Ziel-Planer">
        <div className="space-y-3">
          <Field label="Ziel-HCPI">
            <DecimalInput plus value={target} onChange={setTarget} className="text-2xl font-bold" />
          </Field>
          {active ? (
            <p className="text-sm muted">Laufende Runde · Tee {active.tee} · bereits gespielte Löcher werden berücksichtigt.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Platz">
                <select className="w-full" value={courseId ?? ''} onChange={(e) => { const c = courses.find((x) => x.id === Number(e.target.value)); setCourseId(c?.id ?? null); setTeeName(c?.tees[0]?.name ?? ''); }}>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Tee">
                <select className="w-full" value={tee?.name ?? ''} onChange={(e) => setTeeName(e.target.value)}>
                  {course?.tees.map((t) => <option key={t.name}>{t.name}</option>)}
                </select>
              </Field>
            </div>
          )}
        </div>
      </Card>

      {calc && (
        <>
          <Card>
            {calc.solver.reachable ? (
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Punkte nötig" value={calc.solver.requiredPoints} big />
                <Stat label="AGS max." value={calc.solver.requiredAgs} />
                <Stat label="SD max." value={fmt1(calc.solver.requiredSd)} />
                <Stat label="ergibt HCPI" value={fmtHcpi(calc.solver.resultingHcpi)} />
                <Stat label="Course HCP" value={calc.ch} />
                <Stat label="Ø-Runde (AGS)" value={calc.solver.expectedAgs ?? '–'} />
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
              {calc.solver.warning && <Banner tone={calc.solver.reachable ? 'warn' : 'error'}>{calc.solver.warning}</Banner>}
              {calc.solver.alwaysReached && <Banner tone="ok">Das Ziel ist bereits erreicht – egal wie die Runde läuft.</Banner>}
              {calc.solver.exsc !== 0 && (
                <Banner tone="info">Mit diesem Ergebnis greift der Exceptional Score ({calc.solver.exsc}) – deshalb der Sprung.</Banner>
              )}
            </div>
            {active && (
              <div className="mt-3">
                {active.targetHcpi === target ? (
                  <button className="btn-secondary w-full" onClick={() => setRoundTarget(active, null)}>Ziel aus Runde entfernen</button>
                ) : (
                  <button className="btn-primary w-full" disabled={target === null} onClick={() => setRoundTarget(active, target)}>
                    Als Ziel für die laufende Runde setzen
                  </button>
                )}
              </div>
            )}
          </Card>

          {calc.plan && (
            <Card title="Lochplan">
              <PlanTable plan={calc.plan} />
            </Card>
          )}

          <Card title="Was bringt welche Runde?">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-xs uppercase muted">
                  <th className="table-cell text-left">Ziel</th>
                  <th className="table-cell">Punkte</th>
                  <th className="table-cell">AGS</th>
                  <th className="table-cell">ExSc</th>
                </tr>
              </thead>
              <tbody>
                {calc.steps.map(({ t, s }) => (
                  <tr key={t} onClick={() => setTarget(t)} className="cursor-pointer">
                    <td className="table-cell text-left font-bold">{fmtHcpi(t)}</td>
                    <td className="table-cell">{s.reachable ? s.requiredPoints : '–'}</td>
                    <td className="table-cell">{s.reachable ? s.requiredAgs : '–'}</td>
                    <td className="table-cell">{s.exsc || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs muted">Ausgehend von HCPI {fmtHcpi(calc.hcpiBefore)}. Zeile antippen übernimmt das Ziel.</p>
          </Card>
        </>
      )}
    </div>
  );
}
