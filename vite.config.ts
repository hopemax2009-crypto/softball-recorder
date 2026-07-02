import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';

const repoName = process.env.VITE_REPO_NAME || 'softball-recorder';
const isPages = process.env.GITHUB_PAGES === 'true';
const buildId = existsSync('.build-id')
  ? readFileSync('.build-id', 'utf8').trim()
  : 'dev';

export default defineConfig({
  plugins: [react()],
  base: isPages ? `/${repoName}/` : '/',
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
  },
});
