// Artifact-Build: Service Worker sind dort nicht verfügbar.
export function registerSW(_opts?: unknown): (reload?: boolean) => Promise<void> {
  return async () => undefined;
}
