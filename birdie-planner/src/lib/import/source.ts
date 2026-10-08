import type { ParseResult } from './parser';

/**
 * Gemeinsames Interface aller Datenquellen für den Scoring Record.
 * Jede Quelle liefert eine ParseResult-Vorschau. Übernommen wird erst nach
 * Bestätigung in der editierbaren Vorschau-Tabelle (siehe ImportPreview).
 */
export interface ScoringRecordSource<Input> {
  readonly id: 'pdf' | 'paste' | 'manual' | 'golfde-api';
  readonly label: string;
  /** false = noch nicht nutzbar (z. B. API-Stub) */
  readonly available: boolean;
  load(input: Input): Promise<ParseResult>;
}
