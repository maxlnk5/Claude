// Baut aus dist-artifact/ eine Einzelseite: CSS und JS inline, Worker daneben.
import { copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const out = new URL('../dist-artifact/', import.meta.url).pathname;
const assets = join(out, 'assets');
const files = readdirSync(assets);
const pick = (ext) => files.filter((f) => f.endsWith(ext)).map((f) => readFileSync(join(assets, f), 'utf8'));

const css = pick('.css').join('\n');
const js = pick('.js').join('\n').replace(/<\/script/gi, '<\\/script');
if (pick('.js').length !== 1) throw new Error('erwartet genau ein JS-Bundle');

const require = createRequire(import.meta.url);
copyFileSync(require.resolve('pdfjs-dist/build/pdf.worker.min.mjs'), join(out, 'pdf.worker.min.mjs'));

const page = `<title>Birdie Planner</title>
<meta name="theme-color" content="#14532d">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
writeFileSync(join(out, 'birdie-planner.html'), page);
console.log(`birdie-planner.html: ${(page.length / 1024).toFixed(0)} KB`);
