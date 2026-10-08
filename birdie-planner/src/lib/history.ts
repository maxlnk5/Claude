import { sortRecords } from './derived';
import type { ScoringRecordEntry } from './types';
import { indexFromDifferentials, tableFor } from './whs';

export interface HistoryPoint {
  date: string;
  entry: ScoringRecordEntry;
  sd: number;
  /** HCPI nach dieser Runde */
  hcpi: number | null;
  /** true = aus den SD berechnet (kein Wert im Record) */
  computed: boolean;
  /** gehört zu den aktuell zählenden besten SD der letzten 20 */
  counting: boolean;
  inWindow: boolean;
}

/**
 * Index-Verlauf: HCPI nach Runde i = "HCPI vorher" der Runde i+1 aus dem
 * Record. Für die letzte Runde gilt der aktuelle Profil-HCPI. Fehlt der Wert
 * (z. B. Testdaten), wird er aus den bis dahin vorhandenen SD berechnet.
 */
export function buildHistory(records: ScoringRecordEntry[], currentHcpi: number): HistoryPoint[] {
  const sorted = sortRecords(records);
  const window = sorted.slice(-20);
  const row = tableFor(window.length);
  const best = new Set(
    row ? [...window].sort((a, b) => a.sd - b.sd).slice(0, row.best) : [],
  );
  return sorted.map((entry, i) => {
    const next = sorted[i + 1];
    let hcpi: number | null;
    let computed = false;
    if (!next) hcpi = currentHcpi;
    else if (next.hcpiBefore !== null) hcpi = next.hcpiBefore;
    else {
      hcpi = indexFromDifferentials(sorted.slice(0, i + 1).map((r) => r.sd));
      computed = true;
    }
    return {
      date: entry.date,
      entry,
      sd: entry.sd,
      hcpi,
      computed,
      counting: best.has(entry),
      inWindow: i >= sorted.length - 20,
    };
  });
}
