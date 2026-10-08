import type { RecordType, ScoringRecordEntry } from '../types';

/**
 * Parser für den "Scoring Record Detailliert" von golf.de.
 *
 * Erwarteter Aufbau pro Eintrag (Text aus PDF oder kopiert von der Seite):
 *   Kopf (je Seite):  HCPI: 22,2  Low HCPI: 22,2
 *   Zeile 1:  Nr  Datum  ClubNr  Turnier  Löcher  Art  GBE  SD
 *   Zeile 2:  Club: …  Country: 49  Rd.: 1  PCC: 0
 *   Zeile 3:  Tees: gelb  Par: 70  CR: 70.6  Slope: 120  HCPI: 22,6  CH: 25  ExSc: 0
 *
 * Robustheit:
 * - Zeile 1 wird per Regex erkannt; alles bis zur nächsten Zeile 1 bzw. bis zum
 *   nächsten Seitenkopf ist der "Block" des Eintrags. Die Felder aus Zeile 2/3
 *   werden einzeln im Block gesucht. Es ist also egal, ob Zeile 2 und 3 getrennt,
 *   zusammengezogen oder in anderer Reihenfolge kommen.
 * - Nr und ClubNr sind optional (fehlen oft beim Kopieren von der Webseite).
 * - Dezimalkomma (HCPI) und Dezimalpunkt (SD, CR) werden beide akzeptiert.
 * - Plus-Handicaps ("+1,2") werden als negative Zahl gespeichert.
 * - Abgeschnittene Turniernamen ("…", "...", "-…") werden gekennzeichnet.
 */

export type ParsedEntry = Omit<ScoringRecordEntry, 'id'> & {
  /** Turniername war im Original abgeschnitten */
  truncated: boolean;
  /** Tee-Name aus Zeile 3 */
  teeName: string | null;
  /** Fehlende Pflichtfelder o. ä. */
  issues: string[];
};

export interface ParseResult {
  entries: ParsedEntry[];
  header: { hcpi: number; lowHcpi: number } | null;
  warnings: string[];
}

const NUM = String.raw`[+-]?\d+(?:[.,]\d+)?`;

// Zeile 1. Gruppen: 1 Datum, 2 ClubNr, 3 Turnier, 4 Löcher, 5 Art, 6 GBE, 7 SD
const ENTRY_RE = new RegExp(
  String.raw`^\s*(?:\d{1,3}\s+)?(\d{2}\.\d{2}\.\d{4})\s+(?:(\d{3,6})\s+)?(.+?)\s+(9|18)\s+([ZSHPG])\s+(?:(\d{2,3}|-|NR)\s+)?(${NUM})\s*\*?\s*$`,
);
const HEADER_RE = new RegExp(String.raw`HCPI:\s*(${NUM})\s+Low\s+HCPI:\s*(${NUM})`, 'i');

const FIELD = {
  pcc: new RegExp(String.raw`PCC:\s*(${NUM})`, 'i'),
  tees: /Tees:\s*(.+?)\s+(?=Par:)/i,
  par: /Par:\s*(\d+)/i,
  cr: new RegExp(String.raw`CR:\s*(${NUM})`, 'i'),
  slope: /Slope:\s*(\d+)/i,
  // HCPI in Zeile 3 – nicht der "Low HCPI" aus dem Kopf
  hcpi: new RegExp(String.raw`(?<!Low\s)HCPI:\s*(${NUM})`, 'i'),
  ch: new RegExp(String.raw`CH:\s*(${NUM})`, 'i'),
  exsc: new RegExp(String.raw`ExSc:\s*(${NUM})`, 'i'),
};

const TRUNCATION_RE = /\s*(?:-?…|\.{3}|-\.{3})\s*$/;

/** "22,2" → 22.2, "70.6" → 70.6, "+1,2" → −1.2 (Plus-Handicap). */
export function parseNumber(raw: string, plusIsNegative = false): number {
  const s = raw.trim().replace(',', '.');
  const v = Number.parseFloat(s);
  if (plusIsNegative && s.startsWith('+')) return -Math.abs(v);
  return v;
}

/** "04.10.2026" → "2026-10-04" */
export function germanDateToIso(d: string): string {
  const [dd, mm, yyyy] = d.split('.');
  return `${yyyy}-${mm}-${dd}`;
}

export function isoToGermanDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function cleanTournament(raw: string): { name: string; truncated: boolean } {
  const truncated = TRUNCATION_RE.test(raw);
  return { name: raw.replace(TRUNCATION_RE, '').replace(/\s+/g, ' ').trim(), truncated };
}

function grab(block: string, re: RegExp): string | null {
  return re.exec(block)?.[1] ?? null;
}

export function parseScoringRecordText(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, ' ').trim())
    .filter((l) => l.length > 0);

  const warnings: string[] = [];
  let header: ParseResult['header'] = null;

  // Entry-Zeilen und ihre Blöcke sammeln
  const blocks: Array<{ m: RegExpExecArray; rest: string[] }> = [];
  for (const line of lines) {
    const h = HEADER_RE.exec(line);
    if (h) {
      header ??= { hcpi: parseNumber(h[1] ?? '', true), lowHcpi: parseNumber(h[2] ?? '', true) };
      // Seitenumbruch: Kopf beendet den laufenden Block nicht inhaltlich,
      // er wird nur übersprungen.
      continue;
    }
    const m = ENTRY_RE.exec(line);
    if (m) {
      blocks.push({ m, rest: [] });
    } else if (blocks.length > 0) {
      blocks[blocks.length - 1]?.rest.push(line);
    }
  }

  const entries: ParsedEntry[] = blocks.map(({ m, rest }) => {
    const block = rest.join('  ');
    const issues: string[] = [];
    const { name, truncated } = cleanTournament(m[3] ?? '');
    const gbeRaw = m[6];
    const num = (re: RegExp, plus = false) => {
      const v = grab(block, re);
      return v === null ? null : parseNumber(v, plus);
    };
    const cr = num(FIELD.cr);
    const slope = num(FIELD.slope);
    const par = num(FIELD.par);
    const pcc = num(FIELD.pcc);
    if (cr === null) issues.push('CR fehlt');
    if (slope === null) issues.push('Slope fehlt');
    if (pcc === null) issues.push('PCC fehlt (0 angenommen)');
    return {
      date: germanDateToIso(m[1] ?? ''),
      tournament: name,
      truncated,
      holes: m[4] === '9' ? 9 : 18,
      type: (m[5] ?? 'Z') as RecordType,
      gbe: gbeRaw && /^\d+$/.test(gbeRaw) ? Number(gbeRaw) : null,
      sd: parseNumber(m[7] ?? ''),
      pcc: pcc ?? 0,
      cr,
      slope,
      par,
      hcpiBefore: num(FIELD.hcpi, true),
      ch: num(FIELD.ch, true),
      exsc: num(FIELD.exsc) ?? 0,
      teeName: grab(block, FIELD.tees)?.trim() ?? null,
      origin: 'import' as const,
      issues,
    };
  });

  if (entries.length === 0) {
    warnings.push(
      'Keine Einträge erkannt. Erwartet wird z. B. "1 04.10.2026 8812 Herbstpreis 18 Z 98 23.9".',
    );
  }
  return { entries, header, warnings };
}

/** Nur die Felder eines ScoringRecordEntry übernehmen (Vorschau-Extras verwerfen). */
export function toRecordEntry(e: Omit<ScoringRecordEntry, 'id'>): Omit<ScoringRecordEntry, 'id'> {
  return {
    date: e.date,
    tournament: e.tournament,
    holes: e.holes,
    type: e.type,
    gbe: e.gbe,
    sd: e.sd,
    pcc: e.pcc,
    cr: e.cr,
    slope: e.slope,
    par: e.par,
    hcpiBefore: e.hcpiBefore,
    ch: e.ch,
    exsc: e.exsc,
    origin: e.origin,
  };
}
