import { _electron, test as base, firefox, Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron/out/download';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { FileExplorer } from '../page-objects/explorer-view';
import { downloadVersion } from '../utils/download-version';
import { prebuiltWorkspacePath } from '../workspaces/workspace';
export { expect } from '@playwright/test';

export const runInBrowser = process.env.RUN_IN_BROWSER ? true : false;

export const test = base.extend<{ workspace: string; page: Page }>({
  workspace: prebuiltWorkspacePath,
  page: async ({ workspace }, take) => {
    if (runInBrowser) {
      await runBrowserTest(workspace, take);
    } else {
      await runElectronAppTest(workspace, take);
    }
  }
});

const runBrowserTest = async (workspace: string, take: (r: Page) => Promise<void>) => {
  const browser = await firefox.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  const tmpWorkspace = await createTmpWorkspace(workspace);
  await page.goto(`http://localhost:3000/?folder=${tmpWorkspace}`);
  await initialize(page);
  await take(page);
  await page.close({ runBeforeUnload: true });
  await browser.close();
  await fs.promises.rm(tmpWorkspace, { recursive: true });
};

const runElectronAppTest = async (workspace: string, take: (r: Page) => Promise<void>) => {
  const vscodePath = await downloadAndUnzipVSCode(downloadVersion);
  const tmpWorkspace = await createTmpWorkspace(workspace);
  const electronApp = await _electron.launch({
    executablePath: vscodePath,
    args: [
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--disable-updates',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      `--extensionDevelopmentPath=${path.resolve(__dirname, '../../../extension/')}`,
      tmpWorkspace
    ]
  });
  const page = await electronApp.firstWindow();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.context().tracing.start({ screenshots: true, snapshots: true, title: test.info().title });
  await initialize(page);
  await take(page);
  if (test.info().status === 'failed') {
    const tracePath = test.info().outputPath('trace.zip');
    const screenshotPath = test.info().outputPath('screenshot.png');
    await page.context().tracing.stop({ path: tracePath });
    await page.screenshot({ path: screenshotPath });
    test.info().attachments.push({ name: 'trace', path: tracePath, contentType: 'application/zip' });
    test.info().attachments.push({ name: 'screenshot', path: tracePath, contentType: 'image/png' });
  }
  await electronApp.close();
  await fs.promises.rm(tmpWorkspace, { recursive: true });
};

const initialize = async (page: Page) => {
  const fileExplorer = new FileExplorer(page);
  await fileExplorer.hasIvyStatusBarIcon();
  await fileExplorer.closeAllTabs();
};

const createTmpWorkspace = async (workspace: string) => {
  const tmpDir = await fs.promises.realpath(await fs.promises.mkdtemp(path.join(os.tmpdir(), 'playwrightTestWorkspace')));
  await fs.promises.cp(workspace, tmpDir, { recursive: true });
  return tmpDir;
};
