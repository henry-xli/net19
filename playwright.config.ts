import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1, retries: 0,
  timeout: 30_000, expect: { timeout: 6000 }, reporter: [['list']],
  outputDir: 'test-results',
});
