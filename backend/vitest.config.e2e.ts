import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const TEST_ENV_FILE = '.env.test';

if (existsSync(TEST_ENV_FILE)) {
  process.loadEnvFile(TEST_ENV_FILE);
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    globalSetup: ['./test/setup/prepare-test-database.ts'],
  },
});
