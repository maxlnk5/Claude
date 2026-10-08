import { roundInt } from './rounding';

/**
 * Course Handicap (Platzvorgabe):
 * CH = round(HCPI × Slope / 113 + (CR − Par))
 * Plus-Handicaps sind negative HCPI-Werte und ergeben negative CH.
 */
export function courseHandicap(hcpi: number, slope: number, cr: number, par: number): number {
  return roundInt((hcpi * slope) / 113 + (cr - par));
}

/** Spielvorgabe = round(CH × Faktor). Default-Faktor 100 %. */
export function playingHandicap(ch: number, allowance = 1): number {
  return roundInt(ch * allowance);
}

/**
 * Vorgabeschläge auf einem Loch nach Stroke Index (1 = schwerstes Loch).
 *
 * Positive Vorgabe: jedes Loch bekommt floor(hcp/18), die Restschläge gehen an
 * die Löcher mit SI ≤ Rest. Beispiel CH 24: alle 1, SI 1–6 bekommen 2.
 * CH > 36 funktioniert genauso (CH 40: SI 1–4 bekommen 3).
 *
 * Plus-Vorgabe (hcp < 0): Schläge werden zurückgegeben, und zwar zuerst auf
 * den leichtesten Löchern (SI 18, 17, …). CH −2 → −1 auf SI 17 und 18.
 */
export function strokesOnHole(hcp: number, si: number, holeCount = 18): number {
  if (hcp >= 0) {
    const base = Math.floor(hcp / holeCount);
    const rest = hcp - base * holeCount;
    return base + (si <= rest ? 1 : 0);
  }
  const n = -hcp;
  const base = Math.floor(n / holeCount);
  const rest = n - base * holeCount;
  const s = -(base + (si > holeCount - rest ? 1 : 0));
  return s === 0 ? 0 : s;
}

/** Vorgabeschläge für alle Löcher (gleiche Reihenfolge wie `sis`). */
export function strokeAllocation(hcp: number, sis: number[]): number[] {
  return sis.map((si) => strokesOnHole(hcp, si, sis.length));
}
