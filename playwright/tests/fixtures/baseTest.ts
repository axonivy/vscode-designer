import { _electron, test as base, chromium, type ElectronApplication, type Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { WorkspacePage } from '../page-objects/workspace-page';
import { downloadVersion } from '../utils/download-version';
import { prebuiltWorkspacePath } from '../workspaces/workspace';
export { expect } from '@playwright/test';

export const runInBrowser = process.env.RUN_IN_BROWSER ? true : false;

type TmpWorkspace = { tmpWorkspacePath: string; tmpWsConfig?: string };

type TestFixtures = {
  workspace: string | null;
  closeWelcomePage: boolean;
  tmpWorkspace?: TmpWorkspace;
  electronApp?: ElectronApplication;
  page: Page;
  wsPage: WorkspacePage;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  isReady: void;
};

export const test = base.extend<TestFixtures>({
  workspace: prebuiltWorkspacePath,
  closeWelcomePage: true,
  tmpWorkspace: async ({ workspace }, take) => {
    const tmpWs = await createTmpWorkspace(workspace);
    await take(tmpWs);
    if (!process.env.CI) {
      await removeTmpWorkspace(tmpWs?.tmpWorkspacePath);
    }
  },
  electronApp: async ({ tmpWorkspace }, take) => {
    if (!runInBrowser) {
      await runElectronAppTest(take, tmpWorkspace);
    } else {
      await take(undefined);
    }
  },
  page: async ({ tmpWorkspace, electronApp }, take) => {
    if (electronApp) {
      await pageOfElectronAppTest(electronApp, take);
    } else {
      await runBrowserTest(take, tmpWorkspace);
    }
  },
  wsPage: async ({ page }, take) => {
    await take(new WorkspacePage(page));
  },
  isReady: [
    async ({ tmpWorkspace, page, wsPage, closeWelcomePage }, take) => {
      if (tmpWorkspace) {
        await wsPage.hasReadyStatusMessage();
      }
      if (closeWelcomePage) {
        await page
          .getByRole('tab', { name: 'Axon Ivy PRO Designer' })
          .getByRole('button', { name: 'Close' })
          .click({ delay: 100, force: true });
      }
      await take();
    },
    { auto: true }
  ]
});

const runBrowserTest = async (take: (r: Page) => Promise<void>, tmpWorkspace?: TmpWorkspace) => {
  const browser = await chromium.launch({ args: ['--disable-web-security'] }); // disable-web-security because of https://chromestatus.com/feature/5152728072060928
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  const queryParam = tmpWorkspace
    ? tmpWorkspace.tmpWsConfig
      ? `workspace=${tmpWorkspace.tmpWsConfig}`
      : `folder=${tmpWorkspace.tmpWorkspacePath}`
    : '';
  await page.goto(`http://localhost:3000/?${queryParam}`);
  await page.getByRole('tab', { name: 'Welcome' }).getByRole('button', { name: 'Close' }).click({ delay: 100 });
  await take(page);
  // this goto closes WebSocket connections
  await page.goto('about:blank');
  await browser.close();
};

const runElectronAppTest = async (take: (r: ElectronApplication) => Promise<void>, tmpWorkspace?: TmpWorkspace) => {
  const vscodePath = await downloadAndUnzipVSCode(downloadVersion);
  const extensionDir = path.resolve(process.cwd(), 'test-extension-dir');
  const userDataDir = path.resolve(process.cwd(), 'test-user-data-dir');
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
      `--extensionDevelopmentPath=${path.resolve(import.meta.dirname, '../../../extension/')}`,
      `--extensions-dir=${extensionDir}`,
      `--user-data-dir=${userDataDir}`,
      tmpWorkspace ? (tmpWorkspace.tmpWsConfig ?? tmpWorkspace.tmpWorkspacePath) : ''
    ]
  });
  await take(electronApp);
  await electronApp.close();
};

const pageOfElectronAppTest = async (electronApp: ElectronApplication, take: (r: Page) => Promise<void>) => {
  const page = await electronApp.firstWindow();
  if (process.env.CI) {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.context().tracing.start({ screenshots: true, snapshots: true, title: test.info().title });
  await take(page);
};

const createTmpWorkspace = async (workspace: string | null) => {
  let wsConfig: string | undefined;
  if (!workspace) {
    return undefined;
  }
  if (fs.statSync(workspace).isFile()) {
    wsConfig = path.basename(workspace);
    workspace = path.dirname(workspace);
  }
  const tmpWorkspace = await fs.promises.realpath(await fs.promises.mkdtemp(path.join(os.tmpdir(), 'playwrightTestWorkspace')));
  await fs.promises.cp(workspace, tmpWorkspace, { recursive: true });
  const tmpWsConfig = wsConfig ? path.join(tmpWorkspace, wsConfig) : undefined;
  return { tmpWorkspacePath: tmpWorkspace, tmpWsConfig: tmpWsConfig };
};

const removeTmpWorkspace = async (workspacePath?: string) => {
  if (workspacePath) {
    await fs.promises.rm(workspacePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
  }
};
