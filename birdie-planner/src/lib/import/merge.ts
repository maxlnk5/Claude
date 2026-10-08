import type { ScoringRecordEntry } from '../types';

/** Turniernamen vergleichbar machen (Groß/Klein, Leerzeichen, Abschneidung). */
export function normalizeTournament(name: string): string {
  return name
    .toLowerCase()
    .replace(/(?:-?…|\.{3})\s*$/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Gleiches Turnier, auch wenn einer der Namen abgeschnitten ist. */
export function sameTournament(a: string, b: string): boolean {
  const x = normalizeTournament(a);
  const y = normalizeTournament(b);
  if (x === y) return true;
  if (x.length < 4 || y.length < 4) return false;
  return x.startsWith(y) || y.startsWith(x);
}

export function sameEntry(a: Pick<ScoringRecordEntry, 'date' | 'tournament'>, b: typeof a): boolean {
  return a.date === b.date && sameTournament(a.tournament, b.tournament);
}

type Entry = ScoringRecordEntry;
const COMPARED: Array<keyof Entry> = [
  'holes', 'type', 'gbe', 'sd', 'pcc', 'cr', 'slope', 'par', 'hcpiBefore', 'ch', 'exsc',
];

export interface MergePlan {
  toAdd: Entry[];
  /** bestehende Einträge (mit id) mit neuen Werten */
  toUpdate: Entry[];
  /** ids, die ersetzt werden (Seed-/App-Einträge am selben Datum) */
  toDelete: number[];
  unchanged: number;
}

/**
 * Merge über Datum + Turnier, keine Duplikate.
 * - gleicher Eintrag vorhanden → aktualisieren, wenn sich Werte unterscheiden
 * - sonst neu anlegen
 * - Seed- und App-Einträge (inoffiziell) am selben Datum wie ein importierter
 *   Eintrag werden durch den offiziellen ersetzt.
 * Auch doppelte Einträge innerhalb des Imports (z. B. Seitenumbruch) werden zusammengefasst.
 */
export function planMerge(existing: Entry[], incoming: Entry[]): MergePlan {
  const plan: MergePlan = { toAdd: [], toUpdate: [], toDelete: [], unchanged: 0 };
  const seen: Entry[] = [];
  for (const inc of incoming) {
    if (seen.some((s) => sameEntry(s, inc))) continue;
    seen.push(inc);

    const match = existing.find(
      (e) => (e.origin === 'import' || e.origin === 'manual') && sameEntry(e, inc),
    );
    if (match) {
      const changed = COMPARED.some((k) => match[k] !== inc[k]);
      // Längeren (nicht abgeschnittenen) Namen behalten
      const tournament =
        match.tournament.length >= inc.tournament.length ? match.tournament : inc.tournament;
      if (changed || tournament !== match.tournament) {
        plan.toUpdate.push({ ...inc, tournament, id: match.id, origin: match.origin });
      } else {
        plan.unchanged++;
      }
      continue;
    }
    plan.toAdd.push(inc);
    if (inc.origin === 'import') {
      for (const e of existing) {
        if (
          (e.origin === 'seed' || e.origin === 'app') &&
          e.date === inc.date &&
          e.id !== undefined &&
          !plan.toDelete.includes(e.id)
        ) {
          plan.toDelete.push(e.id);
        }
      }
    }
  }
  return plan;
}
