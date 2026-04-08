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

export const test = base.extend<{ workspace: string; closeAllTabsOnInit: boolean; page: Page }>({
  workspace: prebuiltWorkspacePath,
  closeAllTabsOnInit: true,
  page: async ({ workspace, closeAllTabsOnInit }, take) => {
    if (runInBrowser) {
      await runBrowserTest(workspace, closeAllTabsOnInit, take);
    } else {
      await runElectronAppTest(workspace, closeAllTabsOnInit, take);
    }
  }
});

const runBrowserTest = async (workspace: string, closeAllTabsOnInit: boolean, take: (r: Page) => Promise<void>) => {
  const browser = await chromium.launch({ args: ['--disable-web-security'] }); // disable-web-security because of https://chromestatus.com/feature/5152728072060928
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  const tmpWorkspace = await createTmpWorkspace(workspace);
  const queryParam = tmpWorkspace.tmpWsCofig ? `workspace=${tmpWorkspace.tmpWsCofig}` : `folder=${tmpWorkspace.tmpWorkspace}`;
  await page.goto(`http://localhost:3000/?${queryParam}`);
  await initialize(page, closeAllTabsOnInit);
  await take(page);
  // this goto closes WebSocket connections
  await page.goto('about:blank');
  await browser.close();
  await removeTmpWorkspace(tmpWorkspace.tmpWorkspace);
};

const runElectronAppTest = async (workspace: string, closeAllTabsOnInit: boolean, take: (r: Page) => Promise<void>) => {
  const vscodePath = await downloadAndUnzipVSCode(downloadVersion);
  const [cliPath] = resolveCliArgsFromVSCodeExecutablePath(vscodePath);
  execSync(`"${cliPath}" --install-extension vscjava.vscode-java-pack`);
  const tmpWorkspace = await createTmpWorkspace(workspace);
  const electronApp = await _electron.launch({
    executablePath: vscodePath,
    env: {
      ...process.env,
      ELECTRON_DISABLE_GPU: '1'
    },
    args: [
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--disable-gpu',
      '--disable-gpu-compositing',
      '--disable-software-rasterizer',
      '--in-process-gpu',
      '--disable-updates',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      `--extensionDevelopmentPath=${path.resolve(__dirname, '../../../extension/')}`,
      tmpWorkspace.tmpWsCofig ?? tmpWorkspace.tmpWorkspace
    ]
  });
  const page = await electronApp.firstWindow();
  if (process.env.CI) {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.context().tracing.start({ screenshots: true, snapshots: true, title: test.info().title });
  await initialize(page, closeAllTabsOnInit);
  await take(page);
  await electronApp.close();
  if (!process.env.CI) {
    await removeTmpWorkspace(tmpWorkspace.tmpWorkspace);
  }
};

const initialize = async (page: Page, closeAllTabsOnInit: boolean) => {
  await expect(page.locator('div.statusbar-item:has-text("Axon Ivy")')).toBeVisible();
  if (closeAllTabsOnInit) {
    await new FileExplorer(page).closeAllTabs();
  }
};

const createTmpWorkspace = async (workspace: string) => {
  let wsConfig: string | undefined;
  if (fs.statSync(workspace).isFile()) {
    wsConfig = path.basename(workspace);
    workspace = path.dirname(workspace);
  }
  const tmpWorkspace = await fs.promises.realpath(await fs.promises.mkdtemp(path.join(os.tmpdir(), 'playwrightTestWorkspace')));
  await fs.promises.cp(workspace, tmpWorkspace, { recursive: true });
  const tmpWsCofig = wsConfig ? path.join(tmpWorkspace, wsConfig) : undefined;
  return { tmpWorkspace, tmpWsCofig };
};

const removeTmpWorkspace = async (workspace: string) => {
  await fs.promises.rm(workspace, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
};
