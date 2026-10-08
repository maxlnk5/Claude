import { describe, expect, it } from 'vitest';
import { TEST_HISTORY } from '../fixtures/testRecord';
import {
  agsForPoints,
  computeHoleStats,
  planHoles,
  pointsForAgs,
  solveTarget,
  type PlanInputHole,
} from './index';

const base = {
  history: TEST_HISTORY,
  hcpiBefore: 22.2,
  lowHcpi: 22.2,
  cr: 70.6,
  slope: 120,
  par: 70,
  pcc: 0,
  ch: 24,
};

describe('Punkte ↔ AGS', () => {
  it('36 Punkte = Par + CH', () => {
    expect(pointsForAgs(94, 70, 24)).toBe(36);
    expect(agsForPoints(36, 70, 24)).toBe(94);
    expect(pointsForAgs(87, 70, 24)).toBe(43);
  });
});

describe('Ziel-Solver', () => {
  it('Ziel 21,0 → AGS 87 (43 Punkte)', () => {
    const r = solveTarget({ ...base, targetHcpi: 21.0 });
    expect(r.reachable).toBe(true);
    expect(r.requiredAgs).toBe(87);
    expect(r.requiredSd).toBe(15.4);
    expect(r.requiredPoints).toBe(43);
    expect(r.resultingHcpi).toBe(21.0);
  });
  it('Ziel 20,0 → ExSc-Sprung: AGS 86 reicht schon (19,9)', () => {
    const r = solveTarget({ ...base, targetHcpi: 20.0 });
    expect(r.requiredAgs).toBe(86);
    expect(r.exsc).toBe(-1);
    expect(r.resultingHcpi).toBeLessThanOrEqual(20.0);
  });
  it('Ziel 22,2 ist mit dem schlechtesten Ergebnis erreicht', () => {
    const r = solveTarget({ ...base, targetHcpi: 22.2 });
    expect(r.alwaysReached).toBe(true);
    expect(r.requiredPoints).toBe(0);
  });
  it('unerreichbares Ziel', () => {
    const r = solveTarget({ ...base, targetHcpi: 5.0 });
    expect(r.reachable).toBe(false);
    expect(r.warning).toMatch(/nicht erreichbar/);
  });
  it('Warnung bei sehr ambitioniertem Ziel', () => {
    const r = solveTarget({ ...base, targetHcpi: 18.4 });
    expect(r.reachable).toBe(true);
    expect(r.expectedAgs).not.toBeNull();
    expect(r.warning).toMatch(/ambitioniert/);
  });
  it('mit PCC +1 darf das AGS um 1 höher sein', () => {
    const r = solveTarget({ ...base, pcc: 1, targetHcpi: 21.0 });
    expect(r.requiredAgs).toBe(88);
  });
});

function holes(): PlanInputHole[] {
  // Par 4 außer 3 (Par 3) und 5 (Par 5); SI = Lochnummer; 1 Vorgabeschlag
  return Array.from({ length: 18 }, (_, i) => ({
    no: i + 1,
    par: i === 2 ? 3 : i === 4 ? 5 : 4,
    si: i + 1,
    strokes: 1,
  }));
}

describe('Lochplan', () => {
  it('genau 36 nötig → überall 2 Punkte = Netto-Par', () => {
    const p = planHoles(holes(), 36);
    expect(p.plan.every((h) => h.targetPoints === 2)).toBe(true);
    const h7 = p.plan.find((h) => h.no === 7);
    expect(h7?.targetGross).toBe(5); // Par 4 + 1 Schlag = 5 für 2 Punkte
  });
  it('Mehrpunkte gehen zuerst an Par 5 (Heuristik)', () => {
    const p = planHoles(holes(), 37);
    expect(p.method).toBe('heuristic');
    expect(p.plan.find((h) => h.no === 5)?.targetPoints).toBe(3);
    expect(p.plan.reduce((s, h) => s + h.targetPoints, 0)).toBe(37);
  });
  it('Minderpunkte gehen an die schwersten Löcher', () => {
    const p = planHoles(holes(), 34);
    expect(p.plan.find((h) => h.no === 1)?.targetPoints).toBe(1);
    expect(p.plan.find((h) => h.no === 2)?.targetPoints).toBe(1);
  });
  it('nach 9 Löchern: Rest neu verteilt', () => {
    const hs = holes().map((h, i) => (i < 9 ? { ...h, points: 2 } : h));
    const p = planHoles(hs, 35);
    expect(p.earned).toBe(18);
    expect(p.remainingNeeded).toBe(17);
    expect(p.remainingHoles).toBe(9);
    expect(p.avgPerHole).toBeCloseTo(17 / 9, 6);
    expect(p.plan).toHaveLength(9);
    expect(p.plan.reduce((s, h) => s + h.targetPoints, 0)).toBe(17);
  });
  it('Ziel erreicht → Rest 0 Punkte', () => {
    const hs = holes().map((h, i) => (i < 17 ? { ...h, points: 3 } : h));
    const p = planHoles(hs, 40);
    expect(p.done).toBe(true);
    expect(p.plan[0]?.targetPoints).toBe(0);
  });
  it('unrealistisch und unmöglich', () => {
    const hs = holes().map((h, i) => (i < 17 ? { ...h, points: 0 } : h));
    expect(planHoles(hs, 5).unrealistic).toBe(true);
    // Ass auf Par 4 mit 1 Schlag = 2 + 4 + 1 − 1 = 6 Punkte
    expect(planHoles(hs, 6).feasible).toBe(true);
    expect(planHoles(hs, 6).plan[0]?.targetGross).toBe(1);
    expect(planHoles(hs, 7).feasible).toBe(false);
  });
  it('Statistik ab 3 Runden bestimmt die Reihenfolge', () => {
    const r = new Map<number, number>(holes().map((h) => [h.no, h.no === 1 ? 3 : 1]));
    expect(computeHoleStats([r, r])).toBeNull();
    const stats = computeHoleStats([r, r, r]);
    const p = planHoles(holes(), 37, stats);
    expect(p.method).toBe('stats');
    expect(p.plan.find((h) => h.no === 1)?.targetPoints).toBe(3);
  });
});
