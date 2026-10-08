import { describe, expect, it } from 'vitest';
import type { ScoringRecordEntry } from '../types';
import { planMerge, sameTournament } from './merge';
import { parseNumber, parseScoringRecordText } from './parser';
import { itemsToLines } from './pdfLines';

const SAMPLE = `
Scoring Record Detailliert
HCPI: 22,2  Low HCPI: 22,2
1  04.10.2026  8812  Herbstpreis des Präsidenten  18  Z  98  23.9
Club: GSV Golf-Sport-Verein Düsseldorf  Country: 49  Rd.: 1  PCC: 0
Tees: gelb  Par: 70  CR: 70.6  Slope: 120  HCPI: 22,6  CH: 25  ExSc: 0
2  17.09.2026  8812  Monatsbecher September Vorgabewertung Stablef...  18  Z  97  23.0
Club: GSV Golf-Sport-Verein Düsseldorf  Country: 49  Rd.: 1  PCC: 1
Tees: gelb  Par: 70  CR: 70.6  Slope: 120  HCPI: 22,9  CH: 26  ExSc: 0
Seite 1 von 2
HCPI: 22,2  Low HCPI: 22,2
3  13.09.2026  8812  Private Runde  9  P  45  20.2
Club: GSV Golf-Sport-Verein Düsseldorf  Country: 49  Rd.: 1  PCC: -1
Tees: gelb  Par: 35  CR: 35.3  Slope: 120  HCPI: 23,0  CH: 13  ExSc: -1
4  03.09.2026  1234  Clubmeisterschaft 2026 Runde 1-…  18  S  -  26.7
Club: Anderer Club  Country: 49  Rd.: 1  PCC: 0
Tees: weiß  Par: 72  CR: 72.1  Slope: 131  HCPI: 23,1  CH: 28  ExSc: 0
`;

describe('Scoring-Record-Parser', () => {
  const r = parseScoringRecordText(SAMPLE);

  it('erkennt Kopf und alle Einträge über den Seitenumbruch', () => {
    expect(r.header).toEqual({ hcpi: 22.2, lowHcpi: 22.2 });
    expect(r.entries).toHaveLength(4);
    expect(r.warnings).toEqual([]);
  });

  it('liest Zeile 1–3 korrekt', () => {
    const e = r.entries[0];
    expect(e).toMatchObject({
      date: '2026-10-04',
      tournament: 'Herbstpreis des Präsidenten',
      truncated: false,
      holes: 18,
      type: 'Z',
      gbe: 98,
      sd: 23.9,
      pcc: 0,
      cr: 70.6,
      slope: 120,
      par: 70,
      hcpiBefore: 22.6,
      ch: 25,
      exsc: 0,
      teeName: 'gelb',
      issues: [],
    });
  });

  it('abgeschnittene Turniernamen', () => {
    expect(r.entries[1]?.tournament).toBe('Monatsbecher September Vorgabewertung Stablef');
    expect(r.entries[1]?.truncated).toBe(true);
    expect(r.entries[3]?.tournament).toBe('Clubmeisterschaft 2026 Runde 1');
    expect(r.entries[3]?.truncated).toBe(true);
  });

  it('9-Loch, PCC negativ, ExSc, GBE fehlt', () => {
    expect(r.entries[2]).toMatchObject({ holes: 9, type: 'P', pcc: -1, exsc: -1, par: 35 });
    expect(r.entries[1]?.pcc).toBe(1);
    expect(r.entries[3]).toMatchObject({ gbe: null, type: 'S', slope: 131, teeName: 'weiß' });
  });

  it('kopierter Text ohne Nr/ClubNr, mit Tabs und Zeilen 2+3 in einer Zeile', () => {
    const pasted =
      '04.10.2026\tHerbstpreis\t18\tZ\t98\t23.9\n' +
      'Club: GSV Country: 49 Rd.: 1 PCC: 0 Tees: gelb Par: 70 CR: 70,6 Slope: 120 HCPI: 22,6 CH: 25 ExSc: 0';
    const p = parseScoringRecordText(pasted);
    expect(p.entries).toHaveLength(1);
    expect(p.entries[0]).toMatchObject({ tournament: 'Herbstpreis', cr: 70.6, hcpiBefore: 22.6, ch: 25 });
  });

  it('Plus-Handicap und fehlende Felder', () => {
    const p = parseScoringRecordText(
      'HCPI: +1,2  Low HCPI: +2,0\n1 01.06.2026 8812 Preis 18 Z 69 -1.5\nTees: weiß Par: 72 HCPI: +1,0 CH: +2 ExSc: 0',
    );
    expect(p.header).toEqual({ hcpi: -1.2, lowHcpi: -2 });
    expect(p.entries[0]).toMatchObject({ sd: -1.5, hcpiBefore: -1, ch: -2, cr: null, pcc: 0 });
    expect(p.entries[0]?.issues).toContain('CR fehlt');
  });

  it('Turniername mit Zahlen', () => {
    const p = parseScoringRecordText('5 12.10.2025 8812 18 Loch Preis 9 Teams 18 Z 101 25.6');
    expect(p.entries[0]).toMatchObject({ tournament: '18 Loch Preis 9 Teams', holes: 18, sd: 25.6 });
  });

  it('leerer Text gibt Warnung', () => {
    expect(parseScoringRecordText('Hallo').warnings).toHaveLength(1);
  });

  it('parseNumber', () => {
    expect(parseNumber('22,2')).toBe(22.2);
    expect(parseNumber('+1,2', true)).toBe(-1.2);
    expect(parseNumber('+1,2')).toBe(1.2);
  });
});

describe('PDF-Zeilen', () => {
  it('gruppiert Schnipsel nach y und sortiert nach x', () => {
    const lines = itemsToLines([
      { str: 'Low HCPI: 22,2', x: 120, y: 800, width: 60 },
      { str: 'HCPI: 22,2', x: 10, y: 800.8, width: 40 },
      { str: '23.9', x: 400, y: 780, width: 15 },
      { str: '1', x: 10, y: 780, width: 5 },
      { str: '04.10.2026', x: 30, y: 779.5, width: 40 },
      { str: ' ', x: 50, y: 779.5, width: 2 },
    ]);
    expect(lines).toEqual(['HCPI: 22,2 Low HCPI: 22,2', '1 04.10.2026 23.9']);
  });
});

function entry(p: Partial<ScoringRecordEntry>): ScoringRecordEntry {
  return {
    date: '2026-10-04',
    tournament: 'Herbstpreis',
    holes: 18,
    type: 'Z',
    gbe: 98,
    sd: 23.9,
    pcc: 0,
    cr: 70.6,
    slope: 120,
    par: 70,
    hcpiBefore: 22.6,
    ch: 25,
    exsc: 0,
    origin: 'import',
    ...p,
  };
}

describe('Merge', () => {
  it('sameTournament mit abgeschnittenem Namen', () => {
    expect(sameTournament('Monatsbecher Sept...', 'Monatsbecher September')).toBe(true);
    expect(sameTournament('Herbstpreis', 'herbstpreis ')).toBe(true);
    expect(sameTournament('Herbstpreis', 'Frühjahrspreis')).toBe(false);
  });

  it('keine Duplikate, Updates und neue Einträge', () => {
    const existing = [
      entry({ id: 1 }),
      entry({ id: 2, date: '2026-09-17', tournament: 'Monatsb...', sd: 23.1 }),
    ];
    const incoming = [
      entry({}),
      entry({ date: '2026-09-17', tournament: 'Monatsbecher September', sd: 23.0 }),
      entry({ date: '2026-09-13', tournament: 'Neu' }),
      entry({ date: '2026-09-13', tournament: 'Neu' }), // doppelt im Import
    ];
    const plan = planMerge(existing, incoming);
    expect(plan.unchanged).toBe(1);
    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0]).toMatchObject({ id: 2, sd: 23.0, tournament: 'Monatsbecher September' });
    expect(plan.toAdd).toHaveLength(1);
    expect(plan.toDelete).toEqual([]);
  });

  it('Seed-/App-Einträge am gleichen Datum werden ersetzt', () => {
    const existing = [entry({ id: 7, origin: 'seed', tournament: 'Testdaten' })];
    const plan = planMerge(existing, [entry({})]);
    expect(plan.toAdd).toHaveLength(1);
    expect(plan.toDelete).toEqual([7]);
  });
});
