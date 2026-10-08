import { create } from 'zustand';

/**
 * Eigene Dialoge statt confirm()/alert(): die blockieren in manchen
 * Umgebungen (z. B. eingebettet als Artifact) und liefern dort sofort false.
 */
export type DialogSpec =
  | { kind: 'confirm'; message: string; confirmLabel: string; danger: boolean; resolve: (ok: boolean) => void }
  | { kind: 'notice'; message: string; resolve: (ok: boolean) => void }
  | { kind: 'export'; title: string; fileName: string; text: string; resolve: (ok: boolean) => void };

interface DialogState {
  current: DialogSpec | null;
  close: (ok: boolean) => void;
}

export const useDialog = create<DialogState>()((set, get) => ({
  current: null,
  close: (ok) => {
    get().current?.resolve(ok);
    set({ current: null });
  },
}));

type DialogInput = DialogSpec extends infer D ? (D extends DialogSpec ? Omit<D, 'resolve'> : never) : never;

function open(spec: DialogInput): Promise<boolean> {
  return new Promise((resolve) => {
    useDialog.getState().current?.resolve(false);
    useDialog.setState({ current: { ...spec, resolve } as DialogSpec });
  });
}

export function confirmDialog(message: string, confirmLabel = 'Löschen', danger = true): Promise<boolean> {
  return open({ kind: 'confirm', message, confirmLabel, danger });
}

export function noticeDialog(message: string): Promise<boolean> {
  return open({ kind: 'notice', message });
}

/** JSON anzeigen, kopieren oder als Datei speichern. */
export function exportDialog(title: string, fileName: string, data: unknown): Promise<boolean> {
  return open({ kind: 'export', title, fileName, text: JSON.stringify(data, null, 2) });
}
