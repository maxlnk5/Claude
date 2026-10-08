import { applyExceptionalScore } from './exceptional';
import { round1 } from './rounding';

export const MAX_HCPI = 54;
export const WINDOW = 20;

interface TableRow {
  /** Anzahl bester SD, die gemittelt werden */
  best: number;
  /** Anpassung auf den Mittelwert */
  adj: number;
}

/** WHS-Tabelle: Anzahl verfügbarer SD → Anzahl bester SD und Anpassung. */
export function tableFor(count: number): TableRow | null {
  if (count < 3) return null;
  if (count === 3) return { best: 1, adj: -2 };
  if (count === 4) return { best: 1, adj: -1 };
  if (count === 5) return { best: 1, adj: 0 };
  if (count === 6) return { best: 2, adj: -1 };
  if (count <= 8) return { best: 2, adj: 0 };
  if (count <= 11) return { best: 3, adj: 0 };
  if (count <= 14) return { best: 4, adj: 0 };
  if (count <= 16) return { best: 5, adj: 0 };
  if (count <= 18) return { best: 6, adj: 0 };
  if (count === 19) return { best: 7, adj: 0 };
  return { best: 8, adj: 0 };
}

/**
 * Ungerundeter Index aus einer Liste von SD (die letzten ≤ 20).
 * Gibt null zurück bei weniger als 3 SD.
 */
export function rawIndexFromDifferentials(sds: number[]): number | null {
  const window = sds.slice(-WINDOW);
  const row = tableFor(window.length);
  if (!row) return null;
  const best = [...window].sort((a, b) => a - b).slice(0, row.best);
  const avg = best.reduce((s, x) => s + x, 0) / best.length;
  return avg + row.adj;
}

/** Index ohne Caps, gerundet, max. 54. */
export function indexFromDifferentials(sds: number[]): number | null {
  const raw = rawIndexFromDifferentials(sds);
  if (raw === null) return null;
  return Math.min(MAX_HCPI, round1(raw));
}

export interface CapResult {
  hcpi: number;
  softCap: boolean;
  hardCap: boolean;
}

/**
 * Soft Cap: Liegt der Anstieg über dem Low HCPI über 3,0, zählt der darüber
 * hinausgehende Teil nur zur Hälfte. Hard Cap: maximal Low HCPI + 5,0.
 * Danach Obergrenze 54,0. Ohne Low HCPI (null) keine Caps.
 */
export function applyCaps(index: number, lowHcpi: number | null): CapResult {
  let hcpi = index;
  let softCap = false;
  let hardCap = false;
  if (lowHcpi !== null) {
    const increase = round1(hcpi - lowHcpi);
    if (increase > 3) {
      softCap = true;
      hcpi = lowHcpi + 3 + (increase - 3) / 2;
    }
    if (hcpi > lowHcpi + 5) {
      hardCap = true;
      hcpi = lowHcpi + 5;
    }
  }
  return { hcpi: Math.min(MAX_HCPI, round1(hcpi)), softCap, hardCap };
}

export interface NewHcpiInput {
  /** Bisherige SD (18-Loch-äquivalent), sortiert alt → neu. */
  history: number[];
  /** Unangepasstes SD der neuen Runde. */
  newSd: number;
  hcpiBefore: number;
  /** Low HCPI der letzten 365 Tage, null = keine Caps. */
  lowHcpi: number | null;
}

export interface NewHcpiResult {
  hcpi: number | null;
  rawIndex: number | null;
  exsc: 0 | -1 | -2;
  /** SD der neuen Runde inkl. ExSc */
  newSdAdjusted: number;
  /** Das gesamte neue 20er-Fenster nach Anpassung (alt → neu) */
  window: number[];
  softCap: boolean;
  hardCap: boolean;
}

/**
 * Neuer HCPI nach einer Runde:
 * 1. Fenster = die letzten 19 bisherigen SD + neue Runde (älteste fällt raus)
 * 2. Exceptional Score auf das ganze Fenster anwenden
 * 3. WHS-Tabelle → Mittelwert der besten n (+ Anpassung) → runden
 * 4. Soft/Hard Cap relativ zum Low HCPI, max. 54
 */
export function calculateNewHcpi(input: NewHcpiInput): NewHcpiResult {
  const previous = input.history.slice(-(WINDOW - 1));
  const ex = applyExceptionalScore(previous, input.newSd, input.hcpiBefore);
  const window = [...ex.previousAdjusted, ex.newSdAdjusted];
  const raw = rawIndexFromDifferentials(window);
  if (raw === null) {
    return {
      hcpi: null,
      rawIndex: null,
      exsc: ex.exsc,
      newSdAdjusted: ex.newSdAdjusted,
      window,
      softCap: false,
      hardCap: false,
    };
  }
  const capped = applyCaps(round1(raw), input.lowHcpi);
  return {
    hcpi: capped.hcpi,
    rawIndex: raw,
    exsc: ex.exsc,
    newSdAdjusted: ex.newSdAdjusted,
    window,
    softCap: capped.softCap,
    hardCap: capped.hardCap,
  };
}
