import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@src': path.resolve(process.cwd(), 'src'),
      '@domain': path.resolve(process.cwd(), 'src/domain'),
      '@application': path.resolve(process.cwd(), 'src/application'),
      '@infrastructure': path.resolve(process.cwd(), 'src/infrastructure'),
      '@interfaces': path.resolve(process.cwd(), 'src/interfaces'),
      '@shared': path.resolve(process.cwd(), 'src/shared'),
      '@test': path.resolve(process.cwd(), 'test'),
    },
  },
  test: {
    include: ['test/live/**/*.spec.ts'],
    environment: 'node',
    setupFiles: ['test/vitest.live.setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'threads',
    fileParallelism: false,
  },
});
