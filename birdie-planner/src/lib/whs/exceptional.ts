import { round1 } from './rounding';

/**
 * Exceptional Score Reduction (ExSc, WHS Regel 5.9).
 *
 *   Diff = HCPI_vorher − SD_neu
 *   Diff ≥ 10,0  → −2
 *   Diff ≥  7,0  → −1
 *   sonst        →  0
 */
export function exceptionalScoreReduction(hcpiBefore: number, newSd: number): 0 | -1 | -2 {
  // round1 gegen Gleitkomma-Artefakte (22.2 − 15.2 = 6.999…)
  const diff = round1(hcpiBefore - newSd);
  if (diff >= 10) return -2;
  if (diff >= 7) return -1;
  return 0;
}

export interface ExceptionalResult {
  /** 0, −1 oder −2 */
  exsc: 0 | -1 | -2;
  /** Das SD der neuen Runde nach Anpassung. */
  newSdAdjusted: number;
  /** Die vorherigen SD (gleiche Reihenfolge wie Eingabe) nach Anpassung. */
  previousAdjusted: number[];
}

/**
 * Wendet die Exceptional-Score-Anpassung an.
 *
 * WICHTIG – so verhält sich der DGV-Scoring-Record ("SD inklusive aller Anpassungen"):
 * Die Reduktion wird nicht nur auf das SD der neuen Runde angewendet, sondern auf
 * ALLE SD des aktuellen 20er-Fensters, also die neue Runde plus die 19 vorherigen
 * (die älteste Runde ist zu dem Zeitpunkt bereits herausgefallen).
 *
 * Dadurch sinkt der Durchschnitt der besten 8 um genau |ExSc|, wenn die
 * neue Runde zu den besten 8 gehört. Beispiel aus den Testdaten:
 * HCPI 22,2, neue Runde SD 14,5 → Diff 7,7 → −1 → neuer HCPI 19,9 statt 20,7.
 *
 * Die vorherigen SD aus einem importierten Record enthalten frühere Anpassungen
 * bereits. Deshalb wird hier nur die neue Anpassung addiert, sonst nichts.
 *
 * @param previousSds die bis zu 19 vorherigen SD des neuen Fensters (ohne die neue Runde)
 */
export function applyExceptionalScore(
  previousSds: number[],
  newSd: number,
  hcpiBefore: number,
): ExceptionalResult {
  const exsc = exceptionalScoreReduction(hcpiBefore, newSd);
  return {
    exsc,
    newSdAdjusted: round1(newSd + exsc),
    previousAdjusted: previousSds.map((sd) => round1(sd + exsc)),
  };
}
