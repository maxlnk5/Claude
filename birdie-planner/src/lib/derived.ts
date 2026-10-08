import { computeHoleStats, holeLines, roundContext } from './whs';
import type { Course, Profile, Round, ScoringRecordEntry, Tee } from './types';

/** Records nach Datum aufsteigend (bei gleichem Datum stabil nach id). */
export function sortRecords(records: ScoringRecordEntry[]): ScoringRecordEntry[] {
  return [...records].sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0));
}

/**
 * SD-Historie alt → neu. 9-Loch-Einträge aus dem Import werden mit ihrem SD
 * unverändert übernommen (golf.de weist dort bereits das 18-Loch-SD aus).
 */
export function historySds(records: ScoringRecordEntry[]): number[] {
  return sortRecords(records).map((r) => r.sd);
}

/**
 * Low HCPI für die Caps. Soft/Hard Cap greifen erst mit etabliertem Index
 * (≥ 20 Scores); vorher null.
 */
export function capLowHcpi(profile: Profile, records: ScoringRecordEntry[]): number | null {
  return records.length >= 20 ? profile.lowHcpi : null;
}

export function findTee(course: Course | undefined, teeName: string): Tee | undefined {
  return course?.tees.find((t) => t.name === teeName);
}

/** Persönliche Lochstatistik aus abgeschlossenen Runden auf demselben Tee. */
export function holeStatsFor(rounds: Round[], courseId: number, tee: Tee): Map<number, number> | null {
  const relevant = rounds.filter(
    (r) => r.status === 'finished' && r.courseId === courseId && r.tee === tee.name && r.holes.length > 0,
  );
  const maps = relevant.map((r) => {
    const ctx = roundContext(tee, r.hcpiBefore);
    const m = new Map<number, number>();
    for (const l of holeLines(ctx, r.holes)) {
      if (l.indexPoints !== null) m.set(l.no, l.indexPoints);
    }
    return m;
  });
  return computeHoleStats(maps);
}

export interface TeeCheck {
  ok: boolean;
  problems: string[];
}

export function checkTee(tee: Tee): TeeCheck {
  const problems: string[] = [];
  const sum = tee.holes.reduce((s, h) => s + h.par, 0);
  if (sum !== tee.par) problems.push(`Summe Par der Löcher (${sum}) ≠ Par des Tees (${tee.par})`);
  const sis = [...tee.holes.map((h) => h.si)].sort((a, b) => a - b);
  if (sis.some((s, i) => s !== i + 1)) problems.push('Stroke Index muss jede Zahl 1–18 genau einmal enthalten');
  if (!tee.holesVerified) problems.push('Lochdaten sind Platzhalter – bitte mit der Scorekarte abgleichen');
  return { ok: problems.length === 0, problems };
}
