import { parseScoringRecordText, type ParseResult } from './parser';
import type { ScoringRecordSource } from './source';

/** Text, der aus der golf.de-Seite oder dem PDF kopiert wurde. */
export const PasteImportSource: ScoringRecordSource<string> = {
  id: 'paste',
  label: 'Text einfügen',
  available: true,
  async load(text: string): Promise<ParseResult> {
    return parseScoringRecordText(text);
  },
};
