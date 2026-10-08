// Zentrales Datenmodell. Alle Zahlen als JS-number, Dezimalwerte ungerundet
// gespeichert, wo es um Rechenwerte geht (SD und HCPI liegen gerundet auf 1 Dezimale vor).

export interface Profile {
  id: 'me';
  hcpi: number;
  lowHcpi: number;
  /** ISO-Datum (YYYY-MM-DD), an dem der Low HCPI erreicht wurde. */
  lowHcpiDate: string;
  /** Faktor für die Spielvorgabe, 1 = 100 %. */
  allowance: number;
}

export interface Hole {
  no: number;
  par: number;
  /** Stroke Index 1–18 (1 = schwerstes Loch). */
  si: number;
  length?: number;
}

export interface Tee {
  name: string;
  cr: number;
  slope: number;
  par: number;
  holes: Hole[];
  /** true, sobald die Lochdaten mit der echten Scorekarte abgeglichen wurden. */
  holesVerified: boolean;
}

export interface Course {
  id?: number;
  name: string;
  tees: Tee[];
}

export interface HoleScore {
  no: number;
  /** Bruttoschläge; null = Strich / nicht gespielt / Aufgabe. */
  strokes: number | null;
}

export type RoundStatus = 'active' | 'finished';

export interface Round {
  id?: number;
  /** ISO-Datum YYYY-MM-DD */
  date: string;
  courseId: number;
  tee: string;
  holes: HoleScore[];
  pcc: number;
  /** Ziel-HCPI (optional) für den Ziel-Modus. */
  targetHcpi: number | null;
  status: RoundStatus;
  sdFinal: number | null;
  hcpiBefore: number;
  hcpiAfter: number | null;
  exsc: number;
}

/** Turnierart im DGV-Scoring-Record. */
export type RecordType = 'Z' | 'S' | 'H' | 'P' | 'G';

export type RecordOrigin = 'import' | 'manual' | 'app' | 'seed';

export interface ScoringRecordEntry {
  id?: number;
  /** ISO-Datum YYYY-MM-DD */
  date: string;
  tournament: string;
  holes: 9 | 18;
  type: RecordType;
  /** Gesamt-Brutto-Ergebnis (laut Record), null wenn nicht angegeben. */
  gbe: number | null;
  /** Score Differential inkl. aller Anpassungen (so wie im DGV-Record). */
  sd: number;
  pcc: number;
  cr: number | null;
  slope: number | null;
  par: number | null;
  hcpiBefore: number | null;
  ch: number | null;
  exsc: number;
  origin: RecordOrigin;
}
