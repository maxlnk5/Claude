import { describe, expect, it } from 'vitest';
import { TEST_HISTORY, TEST_PROFILE, TEST_TEE } from '../fixtures/testRecord';
import type { Hole, Tee } from '../types';
import {
  adjustedGrossScore,
  adjustedHoleScore,
  applyCaps,
  applyExceptionalScore,
  calculateNewHcpi,
  courseHandicap,
  exceptionalScoreReduction,
  forecastAll,
  holeLines,
  indexFromDifferentials,
  netDoubleBogey,
  playingHandicap,
  rawIndexFromDifferentials,
  round1,
  roundContext,
  roundInt,
  scoreDifferential,
  stablefordPoints,
  strokeAllocation,
  strokesOnHole,
  tableFor,
} from './index';

const { cr, slope, par } = TEST_TEE;

/** HCPI nach einer neuen 18-Loch-Runde mit Brutto = AGS (keine Kappung). */
function hcpiAfterGross(gross: number, pcc = 0) {
  const sd = scoreDifferential(gross, cr, slope, pcc);
  return calculateNewHcpi({
    history: TEST_HISTORY,
    newSd: sd,
    hcpiBefore: TEST_PROFILE.hcpi,
    lowHcpi: TEST_PROFILE.lowHcpi,
  });
}

describe('Rundung', () => {
  it('rundet x,x5 auf', () => {
    expect(round1(22.25)).toBe(22.3);
    expect(round1(22.2375)).toBe(22.2);
    expect(round1(158.8 / 8)).toBe(19.9); // Gleitkomma 19.849999…
    expect(round1(-0.04)).toBe(0);
    expect(Object.is(round1(-0.04), -0)).toBe(false);
  });
  it('rundet ganze Zahlen ,5 aufwärts', () => {
    expect(roundInt(24.5)).toBe(25);
    expect(roundInt(24.49)).toBe(24);
    expect(roundInt(-2.5)).toBe(-2);
    expect(roundInt(-2.51)).toBe(-3);
  });
});

describe('Course Handicap', () => {
  it('Testplatz: HCPI 22,2 → CH 24', () => {
    expect(courseHandicap(22.2, slope, cr, par)).toBe(24);
  });
  it('Plus-Handicap ergibt negative CH', () => {
    expect(courseHandicap(-2.0, 130, 71.0, 72)).toBe(-3); // -2.30 - 1 = -3.3
    expect(courseHandicap(-1.5, 113, 72, 72)).toBe(-1); // -1.5 → -1 (,5 aufwärts)
  });
  it('CH > 36 möglich', () => {
    expect(courseHandicap(40, 135, 72.5, 72)).toBe(48); // 47.79 + 0.5
  });
  it('Spielvorgabe mit Faktor', () => {
    expect(playingHandicap(24)).toBe(24);
    expect(playingHandicap(24, 0.95)).toBe(23); // 22.8
    expect(playingHandicap(-3, 0.95)).toBe(-3); // -2.85 → -3
  });
});

describe('Vorgabeschläge nach SI', () => {
  const sis = Array.from({ length: 18 }, (_, i) => i + 1);
  it('CH 24: SI 1–6 zwei Schläge, Rest einer', () => {
    const a = strokeAllocation(24, sis);
    expect(a.slice(0, 6)).toEqual([2, 2, 2, 2, 2, 2]);
    expect(a.slice(6)).toEqual(Array(12).fill(1));
    expect(a.reduce((s, x) => s + x, 0)).toBe(24);
  });
  it('CH 18 und 0', () => {
    expect(strokeAllocation(18, sis)).toEqual(Array(18).fill(1));
    expect(strokeAllocation(0, sis)).toEqual(Array(18).fill(0));
  });
  it('CH 5: nur SI 1–5', () => {
    expect(strokesOnHole(5, 5)).toBe(1);
    expect(strokesOnHole(5, 6)).toBe(0);
  });
  it('CH 40 (> 36): SI 1–4 drei Schläge', () => {
    expect(strokesOnHole(40, 4)).toBe(3);
    expect(strokesOnHole(40, 5)).toBe(2);
    expect(strokeAllocation(40, sis).reduce((s, x) => s + x, 0)).toBe(40);
  });
  it('Plus-Handicap −2: Schläge zurück auf SI 17 und 18', () => {
    const a = strokeAllocation(-2, sis);
    expect(a[16]).toBe(-1);
    expect(a[17]).toBe(-1);
    expect(a.slice(0, 16).every((x) => x === 0)).toBe(true);
    expect(a.reduce((s, x) => s + x, 0)).toBe(-2);
  });
});

describe('Stableford und Netto-Doppelbogey', () => {
  it('Beispiel: Par 4, 1 Vorgabeschlag, 4 Schläge = 3 Punkte, 5 Schläge = 2', () => {
    expect(stablefordPoints(5, 4, 1)).toBe(2);
    expect(stablefordPoints(4, 4, 1)).toBe(3);
    expect(stablefordPoints(9, 4, 1)).toBe(0);
    expect(stablefordPoints(null, 4, 1)).toBe(0);
  });
  it('Plus-Handicap: Par 4 mit −1 → Par = 1 Punkt', () => {
    expect(stablefordPoints(4, 4, -1)).toBe(1);
  });
  it('NDB-Kappung, Strich und nicht gespielt', () => {
    expect(netDoubleBogey(4, 1)).toBe(7);
    expect(adjustedHoleScore(9, 4, 1)).toBe(7);
    expect(adjustedHoleScore(6, 4, 1)).toBe(6);
    expect(adjustedHoleScore(null, 4, 1)).toBe(7);
    expect(adjustedHoleScore(undefined, 4, 1)).toBe(7);
  });
  it('AGS über 18 Löcher mit fehlenden Löchern', () => {
    const holes: Hole[] = Array.from({ length: 18 }, (_, i) => ({ no: i + 1, par: 4, si: i + 1 }));
    const strokes = strokeAllocation(18, holes.map((h) => h.si));
    // 17 Löcher je 5 (Netto-Par), Loch 18 fehlt → NDB 7
    const scores = holes.slice(0, 17).map((h) => ({ no: h.no, strokes: 5 }));
    expect(adjustedGrossScore(holes, strokes, scores)).toBe(17 * 5 + 7);
    // Ein Loch mit 12 Schlägen wird auf 7 gekappt
    scores[0] = { no: 1, strokes: 12 };
    expect(adjustedGrossScore(holes, strokes, scores)).toBe(16 * 5 + 7 + 7);
  });
});

describe('Score Differential', () => {
  it('Brutto 91 → 19,2; Brutto 102 → 29,6', () => {
    expect(scoreDifferential(91, cr, slope)).toBe(19.2);
    expect(scoreDifferential(102, cr, slope)).toBe(29.6);
  });
  it('PCC ungleich 0', () => {
    expect(scoreDifferential(91, cr, slope, 1)).toBe(18.3); // 19.4 × 0.9417
    expect(scoreDifferential(91, cr, slope, -1)).toBe(20.2);
  });
  it('negatives SD möglich (Plus-Handicap)', () => {
    expect(scoreDifferential(68, 71.0, 130)).toBe(-2.6); // 113/130 × −3
  });
});

describe('HCPI-Berechnung', () => {
  it('Testdaten: Ø der besten 8 = 22,2375 → 22,2', () => {
    expect(rawIndexFromDifferentials(TEST_HISTORY)).toBeCloseTo(22.2375, 6);
    expect(indexFromDifferentials(TEST_HISTORY)).toBe(22.2);
  });
  it('WHS-Tabelle bei weniger als 20 Runden', () => {
    expect(tableFor(2)).toBeNull();
    expect(indexFromDifferentials([30, 25])).toBeNull();
    expect(indexFromDifferentials([30, 25, 28])).toBe(23); // 25 − 2
    expect(indexFromDifferentials([30, 25, 28, 27])).toBe(24); // 25 − 1
    expect(indexFromDifferentials([30, 25, 28, 27, 26])).toBe(25);
    expect(indexFromDifferentials([30, 25, 28, 27, 26, 29])).toBe(24.5); // 25.5 − 1
    expect(indexFromDifferentials([30, 25, 28, 27, 26, 29, 31])).toBe(25.5);
    expect(indexFromDifferentials([10, 11, 12, 13, 14, 15, 16, 17, 18])).toBe(11); // Ø 3
    expect(indexFromDifferentials(Array.from({ length: 12 }, (_, i) => i + 10))).toBe(11.5); // Ø 4
    expect(indexFromDifferentials(Array.from({ length: 15 }, (_, i) => i + 10))).toBe(12); // Ø 5
    expect(indexFromDifferentials(Array.from({ length: 17 }, (_, i) => i + 10))).toBe(12.5); // Ø 6
    expect(indexFromDifferentials(Array.from({ length: 19 }, (_, i) => i + 10))).toBe(13); // Ø 7
  });
  it('nur die letzten 20 zählen', () => {
    const sds = [1, ...Array(20).fill(30)];
    expect(indexFromDifferentials(sds)).toBe(30);
  });
  it('maximal 54,0', () => {
    expect(indexFromDifferentials(Array(20).fill(70))).toBe(54);
  });
  it('Soft Cap und Hard Cap', () => {
    expect(applyCaps(24.0, 22.2)).toEqual({ hcpi: 24, softCap: false, hardCap: false });
    // Anstieg 4,0 → 3 + 0,5 = 3,5
    expect(applyCaps(26.2, 22.2)).toEqual({ hcpi: 25.7, softCap: true, hardCap: false });
    // Anstieg 9,0 → 3 + 3 = 6 → Hard Cap 5
    expect(applyCaps(31.2, 22.2)).toEqual({ hcpi: 27.2, softCap: true, hardCap: true });
    expect(applyCaps(31.2, null).hcpi).toBe(31.2);
    expect(applyCaps(60, null).hcpi).toBe(54);
  });
});

describe('Exceptional Score', () => {
  it('Schwellen 7,0 und 10,0', () => {
    expect(exceptionalScoreReduction(22.2, 15.3)).toBe(0); // 6,9
    expect(exceptionalScoreReduction(22.2, 15.2)).toBe(-1); // 7,0
    expect(exceptionalScoreReduction(22.2, 12.3)).toBe(-1); // 9,9
    expect(exceptionalScoreReduction(22.2, 12.2)).toBe(-2); // 10,0
  });
  it('Anpassung wirkt auf neue Runde und alle vorherigen SD', () => {
    const r = applyExceptionalScore([20, 25.5], 14.5, 22.2);
    expect(r.exsc).toBe(-1);
    expect(r.newSdAdjusted).toBe(13.5);
    expect(r.previousAdjusted).toEqual([19, 24.5]);
  });
});

describe('Neue Runde mit Testdaten (älteste Runde fällt raus)', () => {
  const cases: Array<[number, number, number]> = [
    [98, 22.2, 0],
    [94, 21.8, 0],
    [91, 21.4, 0],
    [87, 21.0, 0],
  ];
  for (const [gross, expected, exsc] of cases) {
    it(`Brutto ${gross} → ${expected}`, () => {
      const r = hcpiAfterGross(gross);
      expect(r.hcpi).not.toBeNull();
      expect(Math.abs((r.hcpi ?? 0) - expected)).toBeLessThanOrEqual(0.1);
      expect(r.exsc).toBe(exsc);
      expect(r.window).toHaveLength(20);
    });
  }
  it('Brutto 86 → ExSc −1, unter 20 (19,8–19,9)', () => {
    const r = hcpiAfterGross(86);
    expect(r.exsc).toBe(-1);
    expect(r.hcpi).toBeLessThan(20);
    expect(r.hcpi).toBeGreaterThanOrEqual(19.8);
    expect(r.hcpi).toBeLessThanOrEqual(19.9);
  });
  it('Brutto 82 → ExSc −2, ca. 18,4', () => {
    const r = hcpiAfterGross(82);
    expect(r.exsc).toBe(-2);
    expect(Math.abs((r.hcpi ?? 0) - 18.4)).toBeLessThanOrEqual(0.1);
  });
  it('schlechte Runde: Index bleibt (Soft Cap greift nicht)', () => {
    const r = hcpiAfterGross(120);
    expect(r.hcpi).toBe(22.2);
  });
});

describe('Live-Prognose', () => {
  const tee: Tee = {
    name: 'test',
    cr,
    slope,
    par,
    holesVerified: true,
    // 16× Par 4, 2× Par 3 = 70
    holes: Array.from({ length: 18 }, (_, i) => ({ no: i + 1, par: i < 2 ? 3 : 4, si: i + 1 })),
  };
  const ctx = roundContext(tee, 22.2);
  it('ohne gespielte Löcher: Netto-Par = AGS Par + CH', () => {
    const lines = holeLines(ctx, []);
    const [netPar, avg, pickup] = forecastAll(ctx, lines, TEST_HISTORY, 22.2);
    expect(netPar?.ags).toBe(70 + 24);
    expect(avg?.ags).toBe(94);
    expect(pickup?.ags).toBe(70 + 24 + 36);
    expect(netPar?.hcpi).toBe(21.8);
    expect(netPar?.delta).toBe(-0.4);
  });
  it('Schnitt-Modus nutzt bisherige Punkte', () => {
    // 9 Löcher mit je 1 Punkt (Netto-Bogey)
    const scores = ctx.tee.holes.slice(0, 9).map((h, i) => ({
      no: h.no,
      strokes: h.par + (ctx.chStrokes[i] ?? 0) + 1,
    }));
    const lines = holeLines(ctx, scores);
    const avg = forecastAll(ctx, lines, TEST_HISTORY, 22.2)[1];
    expect(avg?.assumedPoints).toBe(1);
    expect(avg?.ags).toBe(94 + 18);
  });
});
