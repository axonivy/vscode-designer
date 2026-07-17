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

type TmpWorkspace = { tmpWorkspacePath: string; tmpWsConfig?: string };

type TestFixtures = {
  workspace: string;
  closeWelcomePage: boolean;
  tmpWorkspace: TmpWorkspace;
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
    await removeTmpWorkspace(tmpWs.tmpWorkspacePath);
  },
  page: async ({ tmpWorkspace }, take) => {
    if (runInBrowser) {
      await runBrowserTest(tmpWorkspace, take);
    } else {
      await runElectronAppTest(tmpWorkspace, take);
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

const runBrowserTest = async (tmpWorkspace: TmpWorkspace, take: (r: Page) => Promise<void>) => {
  const browser = await chromium.launch({ args: ['--disable-web-security'] }); // disable-web-security because of https://chromestatus.com/feature/5152728072060928
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  const queryParam = tmpWorkspace.tmpWsConfig ? `workspace=${tmpWorkspace.tmpWsConfig}` : `folder=${tmpWorkspace.tmpWorkspacePath}`;
  await page.goto(`http://localhost:3000/?${queryParam}`);
  await page.getByRole('tab', { name: 'Welcome' }).getByRole('button', { name: 'Close' }).click({ delay: 100 });
  await take(page);
  // this goto closes WebSocket connections
  await page.goto('about:blank');
  await browser.close();
};

const runElectronAppTest = async (tmpWorkspace: TmpWorkspace, take: (r: Page) => Promise<void>) => {
  const vscodePath = await downloadAndUnzipVSCode(downloadVersion);
  const [cliPath] = resolveCliArgsFromVSCodeExecutablePath(vscodePath);
  const extensionDir = 'test-extension-dir';
  execSync(`"${cliPath}" --install-extension vscjava.vscode-java-pack --extensions-dir ${extensionDir}`);
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
      `--user-data-dir=test-user-data-dir`,
      tmpWorkspace.tmpWsConfig ?? tmpWorkspace.tmpWorkspacePath
    ]
  });
  const page = await electronApp.firstWindow();
  if (process.env.CI) {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.context().tracing.start({ screenshots: true, snapshots: true, title: test.info().title });
  await take(page);
  await electronApp.close();
};

const createTmpWorkspace = async (workspace: string) => {
  let wsConfig: string | undefined;
  if (fs.statSync(workspace).isFile()) {
    wsConfig = path.basename(workspace);
    workspace = path.dirname(workspace);
  }
  const tmpWorkspace = await fs.promises.realpath(await fs.promises.mkdtemp(path.join(os.tmpdir(), 'playwrightTestWorkspace')));
  await fs.promises.cp(workspace, tmpWorkspace, { recursive: true });
  const tmpWsConfig = wsConfig ? path.join(tmpWorkspace, wsConfig) : undefined;
  return { tmpWorkspacePath: tmpWorkspace, tmpWsConfig: tmpWsConfig };
};

const removeTmpWorkspace = async (workspacePath: string) => {
  await fs.promises.rm(workspacePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
};
