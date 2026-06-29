import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = process.env.VITE_REPO_NAME || 'softball-recorder';
const isPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  plugins: [react()],
  base: isPages ? `/${repoName}/` : '/',
});
