import { scoreDifferential } from './differential';
import { calculateNewHcpi } from './hcpi';
import { round1 } from './rounding';
import type { HoleLine, RoundContext } from './round';

export type ForecastMode = 'netPar' | 'average' | 'pickup';

export const FORECAST_LABELS: Record<ForecastMode, string> = {
  netPar: 'Netto-Par',
  average: 'Mein Schnitt',
  pickup: 'Aufgabe',
};

export interface Forecast {
  mode: ForecastMode;
  /** Angenommene Punkte pro Restloch */
  assumedPoints: number;
  ags: number;
  sd: number;
  hcpi: number | null;
  /** Differenz zum aktuellen HCPI (negativ = Verbesserung) */
  delta: number | null;
  exsc: number;
}

/**
 * Live-Prognose: gespielte Löcher zählen mit ihrem bereinigten Score,
 * Restlöcher nach Annahme:
 *  netPar  → 2 Punkte (Netto-Par)
 *  average → bisheriger Punkteschnitt pro gespieltem Loch (ohne gespielte Löcher: 2)
 *  pickup  → 0 Punkte (Netto-Doppelbogey)
 */
export function forecastRound(
  ctx: RoundContext,
  lines: HoleLine[],
  history: number[],
  lowHcpi: number | null,
  mode: ForecastMode,
): Forecast {
  const played = lines.filter((l) => l.gross !== undefined);
  const avg = played.length
    ? played.reduce((s, l) => s + (l.indexPoints ?? 0), 0) / played.length
    : 2;
  const assumed = mode === 'netPar' ? 2 : mode === 'pickup' ? 0 : avg;
  let ags = 0;
  for (const l of lines) {
    if (l.gross !== undefined) {
      ags += l.adjusted ?? l.ndb;
    } else {
      // Brutto = Par + Schläge + 2 − Punkte, nie schlechter als NDB
      ags += Math.min(l.ndb, l.par + l.chStrokes + 2 - assumed);
    }
  }
  ags = Math.round(ags);
  const sd = scoreDifferential(ags, ctx.tee.cr, ctx.tee.slope, ctx.pcc);
  const r = calculateNewHcpi({ history, newSd: sd, hcpiBefore: ctx.hcpiBefore, lowHcpi });
  return {
    mode,
    assumedPoints: assumed,
    ags,
    sd,
    hcpi: r.hcpi,
    delta: r.hcpi === null ? null : round1(r.hcpi - ctx.hcpiBefore),
    exsc: r.exsc,
  };
}

export function forecastAll(
  ctx: RoundContext,
  lines: HoleLine[],
  history: number[],
  lowHcpi: number | null,
): Forecast[] {
  return (['netPar', 'average', 'pickup'] as const).map((m) =>
    forecastRound(ctx, lines, history, lowHcpi, m),
  );
}
