import { round1 } from './rounding';

/** Score Differential: SD = (113 / Slope) × (AGS − CR − PCC), auf 1 Dezimale gerundet. */
export function scoreDifferential(ags: number, cr: number, slope: number, pcc = 0): number {
  return round1((113 / slope) * (ags - cr - pcc));
}

/** Umkehrung: welches AGS entspricht (ungerundet) einem SD? */
export function agsForDifferential(sd: number, cr: number, slope: number, pcc = 0): number {
  return (sd * slope) / 113 + cr + pcc;
}
