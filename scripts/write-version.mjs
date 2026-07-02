import { writeFileSync, mkdirSync } from 'node:fs';

const buildId =
  process.env.GITHUB_SHA?.slice(0, 12) ??
  process.env.VITE_BUILD_ID ??
  `build-${Date.now()}`;

mkdirSync('public', { recursive: true });
writeFileSync('public/version.json', `${JSON.stringify({ buildId }, null, 2)}\n`);
writeFileSync('.build-id', buildId);
console.log(`Build ID: ${buildId}`);
