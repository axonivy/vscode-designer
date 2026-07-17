import { test } from 'vitest';
import { runDownloadIar } from './download-iar';

// eslint-disable-next-line playwright/no-skipped-test
test.skip('download iar success', async () => {
  console.log(process.cwd());
  await runDownloadIar('', 'test-download-iar.iar');
});

// eslint-disable-next-line playwright/no-skipped-test
test.skip('download iar parent not exist', async () => {
  console.log(process.cwd());
  await runDownloadIar('a/b', 'test-download-iar.iar');
});
