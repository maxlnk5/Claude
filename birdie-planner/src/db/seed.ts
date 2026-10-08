import { TEST_PROFILE, TEST_SDS_NEWEST_FIRST, TEST_TEE } from '../lib/fixtures/testRecord';
import { germanDateToIso } from '../lib/import/parser';
import type { Course, Hole, Profile, ScoringRecordEntry } from '../lib/types';
import type { BirdieDB } from './db';

/**
 * Platzhalter-Lochdaten: absichtlich NICHT erfunden. Alle Löcher Par 4,
 * SI = Lochnummer. holesVerified = false → die App zeigt eine Warnung,
 * bis die Werte mit der echten Scorekarte abgeglichen wurden.
 */
export function placeholderHoles(count = 18): Hole[] {
  return Array.from({ length: count }, (_, i) => ({ no: i + 1, par: 4, si: i + 1 }));
}

export function seedCourse(): Course {
  return {
    name: 'GSV Düsseldorf',
    tees: [
      {
        name: 'gelb',
        cr: TEST_TEE.cr,
        slope: TEST_TEE.slope,
        par: TEST_TEE.par,
        holes: placeholderHoles(),
        holesVerified: false,
      },
    ],
  };
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

/** Beim allerersten Start: Profil, Testdaten-Record und Platz-Platzhalter. */
export async function ensureSeed(db: BirdieDB): Promise<boolean> {
  return db.transaction('rw', db.profile, db.courses, db.records, async () => {
    if (await db.profile.get('me')) return false;
    await db.profile.put(seedProfile());
    if ((await db.courses.count()) === 0) await db.courses.add(seedCourse());
    if ((await db.records.count()) === 0) await db.records.bulkAdd(seedRecords());
    return true;
  });
}
