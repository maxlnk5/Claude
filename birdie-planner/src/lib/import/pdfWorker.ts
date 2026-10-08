/** URL des pdf.js-Workers (normaler Build: von Vite gehashte Asset-Datei). */
export async function pdfWorkerUrl(): Promise<string> {
  return (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
}
