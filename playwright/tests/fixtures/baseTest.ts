import { test as base, _electron, Page, chromium } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron/out/download';
export { expect } from '@playwright/test';
import path from 'path';
import { prebuiltWorkspacePath } from '../workspaces/workspace';
import { FileExplorer } from '../page-objects/explorer-view';
import { downloadVersion } from '../utils/download-version';

export const runInBrowser = process.env.RUN_IN_BRWOSER ? true : false;

export const test = base.extend<{ workspace: string; page: Page }>({
  workspace: prebuiltWorkspacePath,
  page: async ({ workspace }, take) => {
    if (runInBrowser) await runBrowserTest(workspace, take);
    else await runElectronAppTest(workspace, take);
  }
});

const runBrowserTest = async (workspace: string, take: (r: Page) => Promise<void>) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`http://localhost:3000/?folder=/home/workspace/${workspace.split('/tests/workspaces/')[1]}`);
  await initialize(page);
  await take(page);
  await browser.close();
};

const runElectronAppTest = async (workspace: string, take: (r: Page) => Promise<void>) => {
  const vscodePath = await downloadAndUnzipVSCode(downloadVersion);
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
      workspace
    ]
  });
  const page = await electronApp.firstWindow();
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
};

const initialize = async (page: Page) => {
  const fileExplorer = new FileExplorer(page);
  await fileExplorer.hasIvyStatusBarIcon();
  await fileExplorer.saveAllFiles();
  await fileExplorer.closeAllTabs();
  await fileExplorer.collapseFolders();
};
