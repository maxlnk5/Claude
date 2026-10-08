import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { db } from './db/db';
import { ensureSeed } from './db/seed';
import './index.css';

registerSW({ immediate: true });

// Dauerhaften Speicher anfragen, damit der Browser die Daten nicht verwirft.
void navigator.storage?.persist?.().catch(() => undefined);

void ensureSeed(db).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
