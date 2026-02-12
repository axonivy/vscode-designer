import { _electron, test as base, chromium, expect, type Page } from '@playwright/test';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import { execSync } from 'child_process';
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
  const browser = await chromium.launch({ args: ['--disable-web-security'] }); // disable-web-security because of https://chromestatus.com/feature/5152728072060928
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  const tmpWorkspace = await createTmpWorkspace(workspace);
  await page.goto(`http://localhost:3000/?folder=${tmpWorkspace}`);
  await initialize(page);
  await take(page);
  // this goto closes WebSocket connections
  await page.goto('about:blank');
  await browser.close();
  await fs.promises.rm(tmpWorkspace, { recursive: true });
};

const runElectronAppTest = async (workspace: string, take: (r: Page) => Promise<void>) => {
  const vscodePath = await downloadAndUnzipVSCode(downloadVersion);
  const [cliPath] = resolveCliArgsFromVSCodeExecutablePath(vscodePath);
  execSync(`"${cliPath}" --install-extension vscjava.vscode-java-pack`);
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
  if (process.env.CI) {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.context().tracing.start({ screenshots: true, snapshots: true, title: test.info().title });
  await initialize(page);
  await take(page);
  await electronApp.close();
  if (!process.env.CI) {
    await fs.promises.rm(tmpWorkspace, { recursive: true });
  }
};

const initialize = async (page: Page) => {
  await expect(page.locator('div.statusbar-item:has-text("Axon Ivy")')).toBeVisible();
  await new FileExplorer(page).closeAllTabs();
};

const createTmpWorkspace = async (workspace: string) => {
  const tmpDir = await fs.promises.realpath(await fs.promises.mkdtemp(path.join(os.tmpdir(), 'playwrightTestWorkspace')));
  await fs.promises.cp(workspace, tmpDir, { recursive: true });
  return tmpDir;
};
