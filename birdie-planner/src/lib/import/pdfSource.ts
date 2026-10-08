import { itemsToLines, type PositionedText } from './pdfLines';
import { parseScoringRecordText, type ParseResult } from './parser';
import type { ScoringRecordSource } from './source';

/**
 * PDF "Scoring Record Detailliert" (golf.de → Mein Bereich → Scoring Record).
 * Das Parsing passiert komplett im Browser mit pdf.js – nichts verlässt das Gerät.
 */
export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  // Lazy laden: pdf.js ist groß und wird nur für den Import gebraucht.
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: PositionedText[] = [];
    for (const it of content.items) {
      if ('str' in it) {
        items.push({ str: it.str, x: it.transform[4] ?? 0, y: it.transform[5] ?? 0, width: it.width });
      }
    }
    pages.push(itemsToLines(items).join('\n'));
  }
  return pages.join('\n');
}

export const PdfImportSource: ScoringRecordSource<File> = {
  id: 'pdf',
  label: 'PDF hochladen',
  available: true,
  async load(file: File): Promise<ParseResult> {
    const text = await extractPdfText(await file.arrayBuffer());
    const result = parseScoringRecordText(text);
    if (result.entries.length === 0 && text.trim().length < 20) {
      result.warnings.push('Das PDF enthält keinen auslesbaren Text (gescannt?).');
    }
    return result;
  },
};
