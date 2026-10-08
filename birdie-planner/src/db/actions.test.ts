import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Tee } from '../lib/types';
import { deleteRound, finishRound, importRecords } from './actions';
import { BirdieDB } from './db';
import { ensureSeed } from './seed';

let db: BirdieDB;
let n = 0;

// Testplatz: Par 70 (16× Par 4, 2× Par 3), SI = Lochnummer, CH 24
const tee: Tee = {
  name: 'gelb',
  cr: 70.6,
  slope: 120,
  par: 70,
  holesVerified: true,
  holes: Array.from({ length: 18 }, (_, i) => ({ no: i + 1, par: i < 2 ? 3 : 4, si: i + 1 })),
};

beforeEach(async () => {
  db = new BirdieDB(`test-${n++}`);
  await ensureSeed(db);
  const c = await db.courses.toCollection().first();
  await db.courses.put({ ...c!, tees: [tee] });
});

/** Runde, die genau `gross` Schläge ohne NDB-Kappung ergibt (CH 24 → Netto-Par = 94). */
async function playRound(gross: number) {
  const course = (await db.courses.toCollection().first())!;
  // Netto-Par je Loch, Differenz auf die ersten Löcher verteilen
  const strokes = tee.holes.map((h) => h.par + (h.si <= 6 ? 2 : 1));
  let diff = gross - 94;
  for (let i = 0; diff !== 0; i = (i + 1) % 18) {
    const step = diff > 0 ? 1 : -1;
    strokes[i]! += step;
    diff -= step;
  }
  const id = await db.rounds.add({
    date: '2026-10-08',
    courseId: course.id!,
    tee: 'gelb',
    holes: strokes.map((s, i) => ({ no: i + 1, strokes: s })),
    pcc: 0,
    targetHcpi: null,
    status: 'active',
    sdFinal: null,
    hcpiBefore: 22.2,
    hcpiAfter: null,
    exsc: 0,
  });
  const round = (await db.rounds.get(id))!;
  await finishRound(db, round, course, tee, true);
  return (await db.rounds.get(id))!;
}

describe('Rundenabschluss', () => {
  it('Brutto 91 → HCPI 21,4, Record-Eintrag, Profil aktualisiert, Low HCPI neu', async () => {
    const r = await playRound(91);
    expect(r.status).toBe('finished');
    expect(r.sdFinal).toBe(19.2);
    expect(r.hcpiAfter).toBe(21.4);
    expect(await db.records.count()).toBe(21);
    const p = await db.profile.get('me');
    expect(p?.hcpi).toBe(21.4);
    expect(p?.lowHcpi).toBe(21.4);
  });

  it('Brutto 86: ExSc −1 auf neue Runde und 19 vorherige; Löschen nimmt alles zurück', async () => {
    const before = (await db.records.toArray()).map((r) => r.sd).sort();
    const r = await playRound(86);
    expect(r.exsc).toBe(-1);
    expect(r.sdFinal).toBe(13.5);
    expect(r.hcpiAfter).toBe(19.9);
    expect(r.adjustedRecordIds).toHaveLength(19);
    const oldest = (await db.records.where('date').equals('2025-09-30').first())!;
    expect(oldest.sd).toBe(43.4); // außerhalb des Fensters, unverändert
    const latest = (await db.records.where('date').equals('2026-10-04').first())!;
    expect(latest.sd).toBe(22.9);

    await deleteRound(db, r);
    const after = (await db.records.toArray()).map((x) => x.sd).sort();
    expect(after).toEqual(before);
    expect(await db.profile.get('me')).toMatchObject({ hcpi: 22.2, lowHcpi: 22.2, lowHcpiDate: '2026-10-04' });
  });
});

describe('Import', () => {
  it('ersetzt Testdaten am selben Datum und legt keine Duplikate an', async () => {
    const entry = {
      date: '2026-10-04', tournament: 'Herbstpreis', holes: 18 as const, type: 'Z' as const, gbe: 98, sd: 23.9,
      pcc: 0, cr: 70.6, slope: 120, par: 70, hcpiBefore: 22.6, ch: 25, exsc: 0, origin: 'import' as const,
    };
    const s1 = await importRecords(db, [entry]);
    expect(s1).toEqual({ added: 1, updated: 0, replaced: 1, unchanged: 0 });
    const s2 = await importRecords(db, [entry]);
    expect(s2).toEqual({ added: 0, updated: 0, replaced: 0, unchanged: 1 });
    expect(await db.records.count()).toBe(20);
  });
});
