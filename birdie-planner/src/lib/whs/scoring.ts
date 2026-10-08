import type { Hole, HoleScore } from '../types';

/** Netto-Doppelbogey = Par + 2 + Vorgabeschläge. */
export function netDoubleBogey(par: number, strokes: number): number {
  return par + 2 + strokes;
}

/**
 * Netto-Stableford-Punkte: max(0, 2 + Par + Vorgabeschläge − Brutto).
 * null (Strich/Aufgabe) = 0 Punkte.
 */
export function stablefordPoints(gross: number | null, par: number, strokes: number): number {
  if (gross === null) return 0;
  return Math.max(0, 2 + par + strokes - gross);
}

/**
 * Bereinigter Lochscore für den Index: maximal Netto-Doppelbogey.
 * Nicht gespielt / Aufgabe (null oder undefined) = Netto-Doppelbogey.
 */
export function adjustedHoleScore(
  gross: number | null | undefined,
  par: number,
  strokes: number,
): number {
  const ndb = netDoubleBogey(par, strokes);
  if (gross === null || gross === undefined) return ndb;
  return Math.min(gross, ndb);
}

/** Bruttoschläge, die auf einem Loch zu `points` Stableford-Punkten führen. */
export function grossForPoints(par: number, strokes: number, points: number): number {
  return par + strokes + 2 - points;
}

/**
 * AGS (bereinigtes Bruttoergebnis) über alle Löcher.
 * `strokes[i]` gehört zu `holes[i]`; fehlende Scores zählen als Netto-Doppelbogey.
 */
export function adjustedGrossScore(holes: Hole[], strokes: number[], scores: HoleScore[]): number {
  const byNo = new Map(scores.map((s) => [s.no, s.strokes]));
  return holes.reduce(
    (sum, h, i) => sum + adjustedHoleScore(byNo.get(h.no), h.par, strokes[i] ?? 0),
    0,
  );
}

/** Stableford-Summe. Fehlende Löcher = 0 Punkte. */
export function totalStableford(holes: Hole[], strokes: number[], scores: HoleScore[]): number {
  const byNo = new Map(scores.map((s) => [s.no, s.strokes]));
  return holes.reduce((sum, h, i) => {
    const g = byNo.get(h.no);
    return sum + (g === undefined ? 0 : stablefordPoints(g, h.par, strokes[i] ?? 0));
  }, 0);
}
