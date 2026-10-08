import { capLowHcpi, historySds } from './derived';
import type { Profile, Round, ScoringRecordEntry, Tee } from './types';
import { calculateNewHcpi, holeLines, roundContext, scoreDifferential } from './whs';

/** Komplette Auswertung einer (laufenden oder fertigen) Runde. */
export function evaluateRound(
  round: Round,
  tee: Tee,
  profile: Profile,
  records: ScoringRecordEntry[],
) {
  const ctx = roundContext(tee, round.hcpiBefore, profile.allowance, round.pcc);
  const lines = holeLines(ctx, round.holes);
  const ags = lines.reduce((s, l) => s + (l.adjusted ?? l.ndb), 0);
  const gross = lines.reduce((s, l) => s + (typeof l.gross === 'number' ? l.gross : 0), 0);
  const points = lines.reduce((s, l) => s + (l.points ?? 0), 0);
  const indexPoints = lines.reduce((s, l) => s + (l.indexPoints ?? 0), 0);
  const missing = lines.filter((l) => l.gross === undefined).length;
  const picked = lines.filter((l) => l.gross === null).length;
  const sd = scoreDifferential(ags, tee.cr, tee.slope, round.pcc);
  const history = historySds(records);
  const result = calculateNewHcpi({
    history,
    newSd: sd,
    hcpiBefore: round.hcpiBefore,
    lowHcpi: capLowHcpi(profile, records),
  });
  return { ctx, lines, ags, gross, points, indexPoints, missing, picked, sd, result, history };
}

export type RoundEvaluation = ReturnType<typeof evaluateRound>;

/** Die (bis zu) 19 jüngsten Record-Einträge, die bei ExSc mit angepasst werden. */
export function recordsInWindow(records: ScoringRecordEntry[]): ScoringRecordEntry[] {
  return [...records]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0))
    .slice(-19);
}
