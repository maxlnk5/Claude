import { agsForDifferential, scoreDifferential } from './differential';
import { calculateNewHcpi } from './hcpi';

export const AGS_MIN = 40;
export const AGS_MAX = 150;

export interface SolverInput {
  targetHcpi: number;
  history: number[];
  hcpiBefore: number;
  lowHcpi: number | null;
  cr: number;
  slope: number;
  par: number;
  pcc: number;
  /** Course Handicap (Index-Schläge), um AGS in Punkte umzurechnen. */
  ch: number;
  holeCount?: number;
}

export interface SolverResult {
  reachable: boolean;
  /** Ziel wird schon mit dem schlechtestmöglichen Ergebnis (nur Striche) erreicht. */
  alwaysReached: boolean;
  requiredAgs: number | null;
  /** SD (vor ExSc) für das nötige AGS */
  requiredSd: number | null;
  /** Nötige Netto-Stableford-Punkte (mit CH-Schlägen) */
  requiredPoints: number | null;
  resultingHcpi: number | null;
  exsc: number;
  /** Erwartetes AGS aus dem Ø der bisherigen SD */
  expectedAgs: number | null;
  warning: string | null;
}

/**
 * Punkte und AGS hängen für 18 Löcher exakt zusammen: jedes Loch liefert
 * 2 + Par + Schläge − min(Brutto, NDB) Punkte, also
 *   Punkte = 2 × Löcher + Par + CH − AGS.
 */
export function pointsForAgs(ags: number, par: number, ch: number, holeCount = 18): number {
  return 2 * holeCount + par + ch - ags;
}

export function agsForPoints(points: number, par: number, ch: number, holeCount = 18): number {
  return 2 * holeCount + par + ch - points;
}

/**
 * Ziel-Solver. Wegen der ExSc-Schwellen ist HCPI(AGS) nicht linear, deshalb
 * werden alle AGS von 40 bis 150 mit der echten Index-Funktion durchgerechnet.
 * Ergebnis ist das größte AGS (= schlechteste Runde), das HCPI ≤ Ziel ergibt.
 */
export function solveTarget(input: SolverInput): SolverResult {
  const holeCount = input.holeCount ?? 18;
  // AGS über Netto-Doppelbogey auf jedem Loch ist unmöglich.
  const agsCeiling = Math.min(AGS_MAX, input.par + 2 * holeCount + input.ch);
  let best: { ags: number; sd: number; hcpi: number; exsc: number } | null = null;
  for (let ags = AGS_MIN; ags <= agsCeiling; ags++) {
    const sd = scoreDifferential(ags, input.cr, input.slope, input.pcc);
    const r = calculateNewHcpi({
      history: input.history,
      newSd: sd,
      hcpiBefore: input.hcpiBefore,
      lowHcpi: input.lowHcpi,
    });
    if (r.hcpi !== null && r.hcpi <= input.targetHcpi + 1e-9) {
      best = { ags, sd, hcpi: r.hcpi, exsc: r.exsc };
    }
  }

  const recent = input.history.slice(-20);
  const expectedAgs =
    recent.length > 0
      ? Math.round(
          agsForDifferential(
            recent.reduce((s, x) => s + x, 0) / recent.length,
            input.cr,
            input.slope,
            input.pcc,
          ),
        )
      : null;

  if (!best) {
    return {
      reachable: false,
      alwaysReached: false,
      requiredAgs: null,
      requiredSd: null,
      requiredPoints: null,
      resultingHcpi: null,
      exsc: 0,
      expectedAgs,
      warning: `Ziel-HCPI ${fmt(input.targetHcpi)} ist mit einer Runde nicht erreichbar.`,
    };
  }

  const requiredPoints = pointsForAgs(best.ags, input.par, input.ch, holeCount);
  let warning: string | null = null;
  if (expectedAgs !== null && best.ags < expectedAgs - 10) {
    warning = `Sehr ambitioniert: ${expectedAgs - best.ags} Schläge besser als dein Schnitt (≈ ${expectedAgs}).`;
  }
  return {
    reachable: true,
    alwaysReached: best.ags === agsCeiling,
    requiredAgs: best.ags,
    requiredSd: best.sd,
    requiredPoints: Math.max(0, requiredPoints),
    resultingHcpi: best.hcpi,
    exsc: best.exsc,
    expectedAgs,
    warning,
  };
}

function fmt(x: number): string {
  return x.toFixed(1).replace('.', ',');
}
