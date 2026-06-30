import { copyFileSync, existsSync } from 'node:fs';

const index = 'dist/index.html';
const notFound = 'dist/404.html';

if (!existsSync(index)) {
  console.error('dist/index.html not found — run vite build first');
  process.exit(1);
}

copyFileSync(index, notFound);
console.log('Copied dist/index.html → dist/404.html');
