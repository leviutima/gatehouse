import { execSync } from 'node:child_process';

const TEST_DATABASE_SUFFIX = '_test';

export default function prepareTestDatabase(): void {
  const url = process.env.DATABASE_URL;
  const database = url ? new URL(url).pathname.slice(1) : '';
  if (!database.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `Refusing to run the e2e tests against database "${database}": its name must end in ${TEST_DATABASE_SUFFIX}. Copy .env.test.example to .env.test.`,
    );
  }
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}
