/**
 * Artifact-Build: Der Worker liegt als eigene Datei neben der Seite
 * (Workers aus eigenen Dateien sind dort erlaubt, Skripte sonst nur inline).
 */
export async function pdfWorkerUrl(): Promise<string> {
  return new URL('pdf.worker.min.mjs', window.location.href).href;
}
