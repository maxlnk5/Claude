import { TEST_PROFILE, TEST_SDS_NEWEST_FIRST, TEST_TEE } from '../lib/fixtures/testRecord';
import { germanDateToIso } from '../lib/import/parser';
import type { Course, Hole, Profile, ScoringRecordEntry, Tee } from '../lib/types';
import type { BirdieDB } from './db';

/**
 * Platzhalter-Lochdaten für neue Plätze: absichtlich NICHT erfunden. Alle
 * Löcher Par 4, SI = Lochnummer. holesVerified = false → die App warnt, bis
 * die Werte mit der echten Scorekarte abgeglichen wurden.
 */
export function placeholderHoles(count = 18): Hole[] {
  return Array.from({ length: count }, (_, i) => ({ no: i + 1, par: 4, si: i + 1 }));
}

/**
 * GSV Düsseldorf laut offizieller Scorekarte 2025: 9-Loch-Anlage, zweimal
 * gespielt. Löcher 10–18 = 1–9 mit eigenem SI. Längen = Spalte "Herren" (gelb).
 */
const GSV_NINE: Array<{ par: number; si1: number; si2: number; length: number }> = [
  { par: 4, si1: 11, si2: 12, length: 322 },
  { par: 3, si1: 15, si2: 16, length: 157 },
  { par: 5, si1: 7, si2: 8, length: 484 },
  { par: 4, si1: 1, si2: 2, length: 405 },
  { par: 3, si1: 17, si2: 18, length: 99 },
  { par: 5, si1: 9, si2: 10, length: 484 },
  { par: 3, si1: 13, si2: 14, length: 190 },
  { par: 4, si1: 5, si2: 6, length: 369 },
  { par: 4, si1: 3, si2: 4, length: 381 },
];

export function gsvHoles(withLength = true): Hole[] {
  const holes = [
    ...GSV_NINE.map((h, i) => ({ no: i + 1, par: h.par, si: h.si1, length: h.length })),
    ...GSV_NINE.map((h, i) => ({ no: i + 10, par: h.par, si: h.si2, length: h.length })),
  ];
  return withLength ? holes : holes.map(({ length: _l, ...h }) => h);
}

/** Tees mit Par 70 und gleicher Loch-Par/SI (Herren). CR/Slope aus der DGV-Vorgabentabelle 05/2025. */
export function gsvTees(): Tee[] {
  return [
    { name: 'gelb', cr: 70.6, slope: 120, par: 70, holes: gsvHoles(), holesVerified: true },
    { name: 'rot', cr: 66.8, slope: 116, par: 70, holes: gsvHoles(false), holesVerified: true },
  ];
}

export function seedCourse(): Course {
  return { name: 'GSV Düsseldorf', tees: gsvTees() };
}

export function seedProfile(): Profile {
  return {
    id: 'me',
    hcpi: TEST_PROFILE.hcpi,
    lowHcpi: TEST_PROFILE.lowHcpi,
    lowHcpiDate: '2026-10-04',
    allowance: 1,
  };
}

export function seedRecords(): ScoringRecordEntry[] {
  return TEST_SDS_NEWEST_FIRST.map(([d, sd]) => ({
    date: germanDateToIso(d),
    tournament: 'Beispielrunde',
    holes: 18,
    type: 'Z',
    gbe: null,
    sd,
    pcc: 0,
    cr: TEST_TEE.cr,
    slope: TEST_TEE.slope,
    par: TEST_TEE.par,
    hcpiBefore: null,
    ch: null,
    exsc: 0,
    origin: 'seed',
  }));
}

/**
 * Bestehende Installationen: GSV-Tee "gelb" mit den alten Platzhaltern
 * (noch nicht abgeglichen, alle Par 4) durch die echten Lochdaten ersetzen.
 * Vom Nutzer bereits bearbeitete Tees bleiben unangetastet.
 */
export async function upgradeGsvPlaceholders(db: BirdieDB): Promise<void> {
  const courses = await db.courses.where('name').equals('GSV Düsseldorf').toArray();
  for (const c of courses) {
    const gelb = c.tees.find((t) => t.name === 'gelb');
    if (!gelb || gelb.holesVerified || !gelb.holes.every((h) => h.par === 4)) continue;
    const real = gsvTees();
    const tees = c.tees.map((t) => (t.name === 'gelb' ? real[0]! : t));
    if (!tees.some((t) => t.name === 'rot')) tees.push(real[1]!);
    await db.courses.put({ ...c, tees });
  }
}

/** Beim allerersten Start: Profil, Beispiel-Record und Platz GSV Düsseldorf. */
export async function ensureSeed(db: BirdieDB): Promise<boolean> {
  return db.transaction('rw', db.profile, db.courses, db.records, async () => {
    await upgradeGsvPlaceholders(db);
    if (await db.profile.get('me')) return false;
    await db.profile.put(seedProfile());
    if ((await db.courses.count()) === 0) await db.courses.add(seedCourse());
    if ((await db.records.count()) === 0) await db.records.bulkAdd(seedRecords());
    return true;
  });
}
