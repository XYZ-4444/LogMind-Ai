import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Produces a self-contained HTML file that runs from file:// without a server.
const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  root,
  configFile: false,
  plugins: [react()],
  build: {
    write: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.join(root, 'src/main.jsx'),
      output: { format: 'iife', name: 'LogMind', inlineDynamicImports: true },
    },
  },
});
const output = (Array.isArray(result) ? result : [result]).flatMap(r => r.output);
const javascript = output.filter(item => item.type === 'chunk').map(item => item.code).join('\n').replace(/<\/script/gi, '<\\/script');
const css = output.filter(item => item.type === 'asset' && item.fileName.endsWith('.css')).map(item => String(item.source)).join('\n').replace(/@import\s+url\([^)]*\)\s*;/g, '');
const icon = await readFile(path.join(root, 'public/favicon.svg'), 'utf8');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#090e1c">
<title>LogMind AI · Find the signal</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}">
<style>${css}</style>
</head>
<body><div id="root"></div><script>${javascript}</script></body>
</html>`;
await writeFile(path.join(root, 'LogMind AI.html'), html);
console.log('Created LogMind AI.html — open directly in a browser; no install or server needed.');
