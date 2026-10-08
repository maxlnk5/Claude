import { useMemo } from 'react';
import { useCourses, useProfile, useRecords, useRounds } from '../db/hooks';
import { capLowHcpi, findTee, holeStatsFor } from '../lib/derived';
import { evaluateRound } from '../lib/finish';
import type { Round } from '../lib/types';
import { forecastAll, planHoles, solveTarget, type PlanInputHole } from '../lib/whs';

/** Alles, was die Rundenscreens brauchen – einmal berechnet, nach jeder Eingabe neu. */
export function useRoundModel(round: Round | null | undefined) {
  const profile = useProfile();
  const courses = useCourses();
  const records = useRecords();
  const rounds = useRounds();

  return useMemo(() => {
    if (!round || !profile || !courses || !records || !rounds) return null;
    const course = courses.find((c) => c.id === round.courseId);
    const tee = findTee(course, round.tee);
    if (!course || !tee) return null;

    const ev = evaluateRound(round, tee, profile, records);
    const lowHcpi = capLowHcpi(profile, records);
    const forecasts = forecastAll(ev.ctx, ev.lines, ev.history, lowHcpi);

    let solver = null;
    let plan = null;
    if (round.targetHcpi !== null) {
      solver = solveTarget({
        targetHcpi: round.targetHcpi,
        history: ev.history,
        hcpiBefore: round.hcpiBefore,
        lowHcpi,
        cr: tee.cr,
        slope: tee.slope,
        par: tee.par,
        pcc: round.pcc,
        ch: ev.ctx.ch,
      });
      if (solver.reachable && solver.requiredPoints !== null) {
        const stats = course.id !== undefined ? holeStatsFor(rounds, course.id, tee) : null;
        const input: PlanInputHole[] = ev.lines.map((l) => ({
          no: l.no,
          par: l.par,
          si: l.si,
          strokes: l.chStrokes,
          points: l.indexPoints ?? undefined,
        }));
        plan = planHoles(input, solver.requiredPoints, stats);
      }
    }
    return { round, course, tee, profile, records, ev, forecasts, solver, plan, lowHcpi };
  }, [round, profile, courses, records, rounds]);
}

export type RoundModel = NonNullable<ReturnType<typeof useRoundModel>>;
