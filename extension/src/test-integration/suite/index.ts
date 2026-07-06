import { glob } from 'glob';
import Mocha from 'mocha';
import path from 'path';

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', timeout: 60_000 });
  const testsRoot = process.env.TEST_SUITE_DIR;
  if (!testsRoot) {
    throw new Error('TEST_SUITE_DIR env var was not set by runTest.ts');
  }

  const files = await glob('**/*.test.js', { cwd: testsRoot });
  files.forEach(file => mocha.addFile(path.resolve(testsRoot, file)));

  return new Promise((resolve, reject) => {
    mocha.run(failures => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed.`));
      } else {
        resolve();
      }
    });
  });
}
