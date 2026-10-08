import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { checkTee } from '../lib/derived';
import { strokeAllocation } from '../lib/whs';
import { BirdieDB } from './db';
import { ensureSeed, gsvTees, placeholderHoles } from './seed';

describe('GSV Düsseldorf Lochdaten (Scorekarte 2025)', () => {
  const [gelb, rot] = gsvTees();
  it('Par 70, Out/In je 35, SI 1–18 genau einmal, Länge 5.782 m', () => {
    expect(checkTee(gelb!).ok).toBe(true);
    expect(checkTee(rot!).ok).toBe(true);
    expect(gelb!.holes.slice(0, 9).reduce((s, h) => s + h.par, 0)).toBe(35);
    expect(gelb!.holes.reduce((s, h) => s + (h.length ?? 0), 0)).toBe(5782);
  });
  it('Stichproben von der Scorekarte', () => {
    expect(gelb!.holes[3]).toEqual({ no: 4, par: 4, si: 1, length: 405 });
    expect(gelb!.holes[13]).toEqual({ no: 14, par: 3, si: 18, length: 99 });
    expect(gelb!.holes[14]).toEqual({ no: 15, par: 5, si: 10, length: 484 });
  });
  it('CH 24: zwei Schläge auf SI 1–6 = Löcher 4, 13, 9, 18, 8, 17', () => {
    const s = strokeAllocation(24, gelb!.holes.map((h) => h.si));
    const two = gelb!.holes.filter((_, i) => s[i] === 2).map((h) => h.no);
    expect(two.sort((a, b) => a - b)).toEqual([4, 8, 9, 13, 17, 18]);
  });
});

describe('Upgrade alter Platzhalter', () => {
  it('ersetzt ungeprüfte Par-4-Platzhalter, lässt bearbeitete Tees in Ruhe', async () => {
    const db = new BirdieDB('seed-upgrade');
    await ensureSeed(db);
    const c = (await db.courses.toCollection().first())!;
    await db.courses.put({ ...c, tees: [{ ...c.tees[0]!, holes: placeholderHoles(), holesVerified: false }] });
    await ensureSeed(db);
    const up = (await db.courses.get(c.id!))!;
    expect(up.tees.map((t) => t.name)).toEqual(['gelb', 'rot']);
    expect(up.tees[0]!.holesVerified).toBe(true);
    expect(up.tees[0]!.holes[2]!.par).toBe(5);

    const custom = { ...up.tees[0]!, holes: placeholderHoles().map((h) => ({ ...h, par: 3 })), holesVerified: false };
    await db.courses.put({ ...up, tees: [custom] });
    await ensureSeed(db);
    expect((await db.courses.get(c.id!))!.tees[0]!.holes[0]!.par).toBe(3);
  });
});
