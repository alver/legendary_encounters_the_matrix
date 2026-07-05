import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base` lets the SAME build work both at a domain root (local dev / `vite
// preview`) and under a subpath like https://<user>.github.io/<repo>/ —
// the deploy workflow sets BASE_PATH to /<repo>/.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  test: {
    environment: 'node',
    testTimeout: 120_000,
  },
});
