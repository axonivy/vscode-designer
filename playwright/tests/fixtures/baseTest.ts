import { _electron, test as base, chromium, expect, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runDownloadAndUnzipVSCode } from '~/utils/download-vscode';
import { WorkspacePage } from '../page-objects/workspace-page';
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
      await waitUntilReady(page, wsPage, !!tmpWorkspace, closeWelcomePage);
      await take();
    },
    { auto: true }
  ]
});

type SharedWorkerFixtures = { sharedPage: Page };
type SharedTestFixtures = { page: Page; wsPage: WorkspacePage };

/**
 * Like `test`, but VS Code is started once per worker (on the prebuilt workspace) and shared by all tests of the worker.
 * All tabs are closed after each test. Tests must not leave state behind that other tests depend on.
 */
export const sharedTest = base.extend<SharedTestFixtures, SharedWorkerFixtures>({
  sharedPage: [
    async ({}, take) => {
      const tmpWs = await createTmpWorkspace(prebuiltWorkspacePath);
      try {
        const run = runInBrowser
          ? runBrowserTest
          : (takePage: (page: Page) => Promise<void>, ws?: TmpWorkspace) =>
              runElectronAppTest(electronApp => pageOfElectronAppTest(electronApp, takePage, 'shared app'), ws);
        await run(async page => {
          await waitUntilReady(page, new WorkspacePage(page), true, true);
          await take(page);
        }, tmpWs);
      } finally {
        if (!process.env.CI) {
          await removeTmpWorkspace(tmpWs?.tmpWorkspacePath);
        }
      }
    },
    { scope: 'worker', timeout: 120_000 }
  ],
  page: async ({ sharedPage }, take, testInfo) => {
    await take(sharedPage);
    // after a failure Playwright discards the worker (and the app) anyway
    if (testInfo.status === testInfo.expectedStatus) {
      await new WorkspacePage(sharedPage).closeAllTabs();
    }
  },
  wsPage: async ({ page }, take) => {
    await take(new WorkspacePage(page));
  }
});

const waitUntilReady = async (page: Page, wsPage: WorkspacePage, withWorkspace: boolean, closeWelcomePage: boolean) => {
  if (withWorkspace) {
    await expect(wsPage.ivyStatusBar).toContainText(/Axon Ivy: Connected|Success - Deploying|Waiting for initial Java compile/);
  }
  if (closeWelcomePage) {
    await page.getByRole('tab', { name: 'Axon Ivy PRO Designer' }).getByRole('button', { name: 'Close' }).click({ delay: 100, force: true });
  }
};

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
  await take(page);
  // this goto closes WebSocket connections
  await page.goto('about:blank');
  await browser.close();
};

const runElectronAppTest = async (take: (r: ElectronApplication) => Promise<void>, tmpWorkspace: TmpWorkspace | undefined) => {
  const vscodePath = await runDownloadAndUnzipVSCode();
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
  try {
    await take(electronApp);
  } finally {
    await electronApp.close();
  }
};

const pageOfElectronAppTest = async (electronApp: ElectronApplication, take: (r: Page) => Promise<void>, title?: string) => {
  const page = await electronApp.firstWindow();
  if (process.env.CI) {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.context().tracing.start({ screenshots: true, snapshots: true, title: title ?? test.info().title });
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
  const tmpWorkspace = await fs.promises.realpath(await fs.promises.mkdtemp(path.join(os.tmpdir(), path.basename(workspace))));
  await fs.promises.cp(workspace, tmpWorkspace, { recursive: true });
  const tmpWsConfig = wsConfig ? path.join(tmpWorkspace, wsConfig) : undefined;
  return { tmpWorkspacePath: tmpWorkspace, tmpWsConfig: tmpWsConfig };
};

const removeTmpWorkspace = async (workspacePath?: string) => {
  if (workspacePath) {
    await fs.promises.rm(workspacePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
  }
};
