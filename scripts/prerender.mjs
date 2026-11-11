// Pré-renderização: injeta o HTML do app em dist/index.html depois do build.
// O visitante continua vendo exatamente o mesmo site (o React redesenha tudo
// ao carregar); o HTML pronto serve para Google, Bing, WhatsApp, LinkedIn etc.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ssrDir = path.join(root, '.ssr');

const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);
const appHtml = render();

const file = path.join(dist, 'index.html');
const html = await readFile(file, 'utf8');
const marker = '<div id="root"></div>';
if (!html.includes(marker)) throw new Error('Marcador <div id="root"></div> não encontrado em dist/index.html');

await writeFile(file, html.replace(marker, `<div id="root" data-ssr>${appHtml}</div>`));
await rm(ssrDir, { recursive: true, force: true });
console.log(`✓ Pré-renderizado: ${(appHtml.length / 1024).toFixed(1)} KB de HTML em dist/index.html`);
