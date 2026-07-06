import { _electron, test as base, chromium, type Page } from '@playwright/test';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { WorkspacePage } from '../page-objects/workspace-page';
import { downloadVersion } from '../utils/download-version';
import { prebuiltWorkspacePath } from '../workspaces/workspace';
export { expect } from '@playwright/test';

export const runInBrowser = process.env.RUN_IN_BROWSER ? true : false;

type TestFixtures = {
  workspace: string;
  closeWelcomePage: boolean;
  page: Page;
  wsPage: WorkspacePage;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  isReady: void;
};

export const test = base.extend<TestFixtures>({
  workspace: prebuiltWorkspacePath,
  closeWelcomePage: true,
  page: async ({ workspace }, take) => {
    if (runInBrowser) {
      await runBrowserTest(workspace, take);
    } else {
      await runElectronAppTest(workspace, take);
    }
  },
  wsPage: async ({ page }, take) => {
    await take(new WorkspacePage(page));
  },
  isReady: [
    async ({ page, wsPage, closeWelcomePage }, take) => {
      await wsPage.hasReadyStatusMessage();
      if (closeWelcomePage) {
        await page.getByRole('tab', { name: 'Axon Ivy PRO Designer' }).getByRole('button', { name: 'Close' }).click({ delay: 100 });
      }
      await take();
    },
    { auto: true }
  ]
});

const runBrowserTest = async (workspace: string, take: (r: Page) => Promise<void>) => {
  const browser = await chromium.launch({ args: ['--disable-web-security'] }); // disable-web-security because of https://chromestatus.com/feature/5152728072060928
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  const tmpWorkspace = await createTmpWorkspace(workspace);
  const queryParam = tmpWorkspace.tmpWsCofig ? `workspace=${tmpWorkspace.tmpWsCofig}` : `folder=${tmpWorkspace.tmpWorkspace}`;
  await page.goto(`http://localhost:3000/?${queryParam}`);
  await page.getByRole('tab', { name: 'Welcome' }).getByRole('button', { name: 'Close' }).click({ delay: 100 });
  await take(page);
  // this goto closes WebSocket connections
  await page.goto('about:blank');
  await browser.close();
  await removeTmpWorkspace(tmpWorkspace.tmpWorkspace);
};

const runElectronAppTest = async (workspace: string, take: (r: Page) => Promise<void>) => {
  const vscodePath = await downloadAndUnzipVSCode(downloadVersion);
  const [cliPath] = resolveCliArgsFromVSCodeExecutablePath(vscodePath);
  const extensionDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pw-vscode-ext-'));
  execSync(`"${cliPath}" --install-extension vscjava.vscode-java-pack --extensions-dir ${extensionDir}`);
  const tmpWorkspace = await createTmpWorkspace(workspace);
  const userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pw-vscode-user-'));
  const electronApp = await _electron.launch({
    executablePath: vscodePath,
    args: [
      '--disable-dev-shm-usage',
      '--disable-telemetry',
      '--disable-gpu',
      '--disable-animation',
      '--disable-updates',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      `--extensionDevelopmentPath=${path.resolve(__dirname, '../../../extension/')}`,
      `--extensions-dir=${extensionDir}`,
      `--user-data-dir=${userDataDir}`,
      tmpWorkspace.tmpWsCofig ?? tmpWorkspace.tmpWorkspace
    ]
  });
  try {
    const page = await electronApp.firstWindow();
    if (process.env.CI) {
      await page.setViewportSize({ width: 1920, height: 1080 });
    }
    await page.context().tracing.start({ screenshots: true, snapshots: true, title: test.info().title });
    await take(page);
  } finally {
    await electronApp.close().catch(() => undefined);
    await fs.promises.rm(extensionDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
    await fs.promises.rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
    if (!process.env.CI) {
      await removeTmpWorkspace(tmpWorkspace.tmpWorkspace);
    }
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
