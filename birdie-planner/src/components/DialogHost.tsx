import { useEffect, useRef, useState } from 'react';
import { useDialog } from '../store/dialog';

function saveFile(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DialogHost() {
  const { current, close } = useDialog();
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCopied('idle');
    okRef.current?.focus();
    if (!current) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, close]);

  if (!current) return null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('ok');
    } catch {
      // Zwischenablage verweigert: Text markieren, damit man ihn selbst kopieren kann
      textRef.current?.select();
      setCopied('fail');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => close(false)}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md space-y-4 rounded-2xl border-2 border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {current.kind === 'export' ? (
          <>
            <h2 className="text-lg font-bold">{current.title}</h2>
            <textarea ref={textRef} readOnly className="h-48 w-full font-mono text-xs" value={current.text} aria-label="Export-Daten" />
            {copied === 'ok' && <p className="text-sm text-green-800 dark:text-green-400">In die Zwischenablage kopiert.</p>}
            {copied === 'fail' && <p className="text-sm text-amber-800 dark:text-amber-300">Kopieren nicht erlaubt – Text ist markiert, bitte selbst kopieren.</p>}
            <div className="grid grid-cols-2 gap-2">
              <button ref={okRef} className="btn-primary" onClick={() => void copy(current.text)}>Kopieren</button>
              <button className="btn-secondary" onClick={() => saveFile(current.fileName, current.text)}>Als Datei</button>
            </div>
            <button className="btn-secondary w-full" onClick={() => close(true)}>Schließen</button>
          </>
        ) : (
          <>
            <p className="text-base">{current.message}</p>
            <div className={current.kind === 'confirm' ? 'grid grid-cols-2 gap-2' : 'grid'}>
              {current.kind === 'confirm' && (
                <button className="btn-secondary" onClick={() => close(false)}>Abbrechen</button>
              )}
              <button
                ref={okRef}
                className={current.kind === 'confirm' && current.danger ? 'btn-danger' : 'btn-primary'}
                onClick={() => close(true)}
              >
                {current.kind === 'confirm' ? current.confirmLabel : 'OK'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
