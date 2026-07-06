import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function main() {
  const javaHome = process.env.IVY_JAVA_HOME ?? process.env.JAVA_HOME;
  if (!javaHome) {
    throw new Error('JAVA_HOME (or IVY_JAVA_HOME) must be set to a Java 25 installation to run this test.');
  }

  // process.cwd() is the extension package root (this script is run via a package script from `extension/`).
  const extensionDevelopmentPath = process.cwd();
  const extensionTestsPath = path.resolve(process.cwd(), 'dist-test-integration/suite/index.js');
  const fixtureWorkspacePath = path.resolve(process.cwd(), 'src/test-integration/fixtures/mcpEnabled');
  const workspacePath = await prepareWorkspace(fixtureWorkspacePath, javaHome);

  const vscodeExecutablePath = await downloadAndUnzipVSCode();

  await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [
      workspacePath,
      '--disable-extensions',
      '--disable-workspace-trust',
      '--disable-gpu',
      '--skip-welcome',
      '--skip-release-notes'
    ],
    extensionTestsEnv: {
      IVY_JAVA_HOME: javaHome,
      // process.cwd() inside the spawned extension host is not guaranteed to be the extension package root.
      TEST_SUITE_DIR: path.resolve(process.cwd(), 'dist-test-integration/suite'),
      // Optional: only present when running the exploratory Copilot CLI test (see local-mcp-copilot.test.ts).
      ...(process.env.GH_TOKEN ? { GH_TOKEN: process.env.GH_TOKEN } : {})
    }
  });
}

async function prepareWorkspace(fixtureWorkspacePath: string, javaHome: string): Promise<string> {
  const tmpWorkspace = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcp-extension-host-workspace-'));
  await fs.promises.cp(fixtureWorkspacePath, tmpWorkspace, { recursive: true });

  const settingsPath = path.join(tmpWorkspace, '.vscode/settings.json');
  const settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf8'));
  settings['java.jdt.ls.java.home'] = javaHome;
  await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2));

  return tmpWorkspace;
}

main().catch(error => {
  console.error('Extension-host integration test failed to run:', error);
  process.exit(1);
});
