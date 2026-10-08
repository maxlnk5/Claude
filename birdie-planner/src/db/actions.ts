import { round1 } from '../lib/whs';
import { evaluateRound, recordsInWindow } from '../lib/finish';
import { planMerge } from '../lib/import/merge';
import type { Course, Profile, Round, ScoringRecordEntry, Tee } from '../lib/types';
import type { BirdieDB } from './db';

export async function saveHoleScore(db: BirdieDB, roundId: number, no: number, strokes: number | null | undefined) {
  await db.transaction('rw', db.rounds, async () => {
    const r = await db.rounds.get(roundId);
    if (!r) return;
    const holes = r.holes.filter((h) => h.no !== no);
    if (strokes !== undefined) holes.push({ no, strokes });
    holes.sort((a, b) => a.no - b.no);
    await db.rounds.update(roundId, { holes });
  });
}

/**
 * Runde abschließen:
 * - Runde als fertig markieren (SD inkl. ExSc, HCPI danach)
 * - optional inoffiziellen Eintrag im Scoring Record anlegen; bei ExSc werden
 *   auch die 19 vorherigen SD angepasst (wie im DGV-Record). Die ids werden
 *   gemerkt, damit Löschen die Anpassung rückgängig machen kann.
 * - Profil-HCPI und ggf. Low HCPI aktualisieren
 */
export async function finishRound(
  db: BirdieDB,
  round: Round,
  course: Course,
  tee: Tee,
  addToRecord: boolean,
): Promise<void> {
  await db.transaction('rw', db.rounds, db.records, db.profile, async () => {
    const profile = await db.profile.get('me');
    if (!profile || round.id === undefined) throw new Error('Profil oder Runde fehlt');
    const records = await db.records.toArray();
    const ev = evaluateRound(round, tee, profile, records);
    const hcpiAfter = ev.result.hcpi;
    let recordId: number | undefined;
    let previousLow: Round['previousLow'];
    const adjustedRecordIds: number[] = [];
    if (addToRecord) {
      if (ev.result.exsc !== 0) {
        for (const r of recordsInWindow(records)) {
          if (r.id === undefined) continue;
          await db.records.update(r.id, { sd: round1(r.sd + ev.result.exsc) });
          adjustedRecordIds.push(r.id);
        }
      }
      recordId = await db.records.add({
        date: round.date,
        tournament: `${course.name} ${tee.name} (Birdie Planner)`,
        holes: 18,
        type: 'P',
        gbe: ev.gross,
        sd: ev.result.newSdAdjusted,
        pcc: round.pcc,
        cr: tee.cr,
        slope: tee.slope,
        par: tee.par,
        hcpiBefore: round.hcpiBefore,
        ch: ev.ctx.ch,
        exsc: ev.result.exsc,
        origin: 'app',
      });
      if (hcpiAfter !== null) {
        const p: Partial<Profile> = { hcpi: hcpiAfter };
        if (hcpiAfter < profile.lowHcpi) {
          previousLow = { lowHcpi: profile.lowHcpi, lowHcpiDate: profile.lowHcpiDate };
          p.lowHcpi = hcpiAfter;
          p.lowHcpiDate = round.date;
        }
        await db.profile.update('me', p);
      }
    }
    await db.rounds.update(round.id, {
      status: 'finished',
      sdFinal: ev.result.newSdAdjusted,
      hcpiAfter,
      exsc: ev.result.exsc,
      recordId,
      adjustedRecordIds,
      previousLow,
    });
  });
}

/** Runde löschen und ihren Record-Eintrag samt ExSc-Anpassung zurücknehmen. */
export async function deleteRound(db: BirdieDB, round: Round): Promise<void> {
  await db.transaction('rw', db.rounds, db.records, db.profile, async () => {
    if (round.recordId !== undefined) {
      await db.records.delete(round.recordId);
      for (const id of round.adjustedRecordIds ?? []) {
        const r = await db.records.get(id);
        if (r) await db.records.update(id, { sd: round1(r.sd - round.exsc) });
      }
      const profile = await db.profile.get('me');
      if (profile && round.hcpiAfter !== null && profile.hcpi === round.hcpiAfter) {
        await db.profile.update('me', { hcpi: round.hcpiBefore });
      }
      if (profile && round.previousLow && profile.lowHcpi === round.hcpiAfter) {
        await db.profile.update('me', round.previousLow);
      }
    }
    if (round.id !== undefined) await db.rounds.delete(round.id);
  });
}

export interface MergeSummary {
  added: number;
  updated: number;
  replaced: number;
  unchanged: number;
}

export async function importRecords(db: BirdieDB, incoming: Array<Omit<ScoringRecordEntry, 'id'>>): Promise<MergeSummary> {
  return db.transaction('rw', db.records, async () => {
    const plan = planMerge(await db.records.toArray(), incoming);
    await db.records.bulkDelete(plan.toDelete);
    await db.records.bulkPut(plan.toUpdate);
    await db.records.bulkAdd(plan.toAdd);
    return {
      added: plan.toAdd.length,
      updated: plan.toUpdate.length,
      replaced: plan.toDelete.length,
      unchanged: plan.unchanged,
    };
  });
}

/** Vollständiger JSON-Export aller lokalen Daten. */
export async function exportAll(db: BirdieDB) {
  return {
    app: 'birdie-planner',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: await db.profile.get('me'),
    courses: await db.courses.toArray(),
    rounds: await db.rounds.toArray(),
    records: await db.records.toArray(),
  };
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
