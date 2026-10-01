import fs from 'fs';
import os from 'os';
import path from 'path';
import { test } from '~/fixtures/baseTest';

// valid but empty jar (zip end of central directory record only)
const EMPTY_JAR = Buffer.from([0x50, 0x4b, 0x05, 0x06, ...new Array(18).fill(0)]);

test('Deploy project when Maven dependencies folder is created', async ({ wsPage, tmpWorkspace }) => {
  // Maven (m2e) creates target/lib/mvn-deps together with its jars, the file watcher may only report the new folder
  const libDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'lib'));
  await fs.promises.mkdir(path.join(libDir, 'mvn-deps'));
  await fs.promises.writeFile(path.join(libDir, 'mvn-deps', 'dependency.jar'), EMPTY_JAR);
  await fs.promises.rename(libDir, path.join(tmpWorkspace!.tmpWorkspacePath, 'target', 'lib'));

  await wsPage.statusMessageContains('Deploying project');
});
