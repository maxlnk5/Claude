import type { HoleScore, Tee } from '../types';
import { courseHandicap, playingHandicap, strokeAllocation } from './handicap';
import { adjustedHoleScore, netDoubleBogey, stablefordPoints } from './scoring';

/** Alles, was für eine Runde auf einem Tee feststeht. */
export interface RoundContext {
  tee: Tee;
  hcpiBefore: number;
  allowance: number;
  pcc: number;
  ch: number;
  ph: number;
  /** Vorgabeschläge je Loch nach CH (für den Index). */
  chStrokes: number[];
  /** Vorgabeschläge je Loch nach Spielvorgabe (für Stableford-Anzeige). */
  phStrokes: number[];
}

export function roundContext(tee: Tee, hcpiBefore: number, allowance = 1, pcc = 0): RoundContext {
  const ch = courseHandicap(hcpiBefore, tee.slope, tee.cr, tee.par);
  const ph = playingHandicap(ch, allowance);
  const sis = tee.holes.map((h) => h.si);
  return {
    tee,
    hcpiBefore,
    allowance,
    pcc,
    ch,
    ph,
    chStrokes: strokeAllocation(ch, sis),
    phStrokes: strokeAllocation(ph, sis),
  };
}

export interface HoleLine {
  no: number;
  par: number;
  si: number;
  /** Vorgabeschläge (Spielvorgabe) */
  strokes: number;
  /** Vorgabeschläge (CH, Index) */
  chStrokes: number;
  /** undefined = noch nicht gespielt, null = Strich */
  gross: number | null | undefined;
  points: number | null;
  /** Punkte mit CH-Schlägen, entspricht dem Index-Beitrag */
  indexPoints: number | null;
  adjusted: number | null;
  ndb: number;
}

export function holeLines(ctx: RoundContext, scores: HoleScore[]): HoleLine[] {
  const byNo = new Map(scores.map((s) => [s.no, s.strokes]));
  return ctx.tee.holes.map((h, i) => {
    const strokes = ctx.phStrokes[i] ?? 0;
    const chStrokes = ctx.chStrokes[i] ?? 0;
    const gross = byNo.has(h.no) ? (byNo.get(h.no) ?? null) : undefined;
    const played = gross !== undefined;
    return {
      no: h.no,
      par: h.par,
      si: h.si,
      strokes,
      chStrokes,
      gross,
      points: played ? stablefordPoints(gross, h.par, strokes) : null,
      indexPoints: played ? stablefordPoints(gross, h.par, chStrokes) : null,
      adjusted: played ? adjustedHoleScore(gross, h.par, chStrokes) : null,
      ndb: netDoubleBogey(h.par, chStrokes),
    };
  });
}
