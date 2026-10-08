import type { ParseResult } from './parser';
import type { ScoringRecordSource } from './source';

/**
 * GolfDeApiSource – STUB, bewusst ohne Funktion.
 *
 * Stand: golf.de / DGV bietet keine öffentliche, dokumentierte API für den
 * Scoring Record an. Die Seite ist per Login und Cloudflare-Bot-Schutz
 * geschützt. Diese App macht deshalb absichtlich:
 *   - KEIN Scraping,
 *   - KEINE Speicherung von golf.de-Zugangsdaten,
 *   - KEIN Umgehen des Bot-Schutzes.
 *
 * TODO (wenn ein offizieller Zugang vom DGV kommt):
 *   1. Auth-Verfahren laut DGV-Doku einbauen (bevorzugt OAuth2 mit PKCE,
 *      Token nur im Speicher bzw. IndexedDB, nie das Passwort).
 *   2. Endpoint für den Scoring Record abrufen und auf ParsedEntry mappen
 *      (Felder siehe parser.ts / types.ts ScoringRecordEntry).
 *   3. `available` auf true setzen und die externe Domain in der
 *      Content-Security-Policy freigeben. Bis dahin macht die App keine
 *      externen Requests.
 */
export const GolfDeApiSource: ScoringRecordSource<void> = {
  id: 'golfde-api',
  label: 'golf.de (offizielle Schnittstelle – noch nicht verfügbar)',
  available: false,
  async load(): Promise<ParseResult> {
    throw new Error('Keine offizielle golf.de-Schnittstelle verfügbar. Bitte PDF- oder Text-Import nutzen.');
  },
};
