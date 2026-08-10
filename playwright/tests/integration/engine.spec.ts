import { expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import type { WorkspacePage } from '~/page-objects/workspace-page';
import { test } from '../fixtures/baseTest';
import { OutputView } from '../page-objects/output-view';
import { SettingsView } from '../page-objects/settings-view';
import { embeddedEngineWorkspace, noEngineWorkspacePath, noProjectWorkspacePath } from '../workspaces/workspace';

test.describe('Engine run by extension', () => {
  test.use({ workspace: embeddedEngineWorkspace });

  test('check if extension can download and start engine', async ({ wsPage }) => {
    const outputview = new OutputView(wsPage);
    await outputview.checkIfEngineStarted();
  });

  test('Java processes are terminated with extension reload', { tag: '@serial' }, async ({ wsPage }) => {
    const outputview = new OutputView(wsPage);
    await outputview.checkIfEngineStarted();
    const numOfJavaProcessesBefore = await readNumberOfJavaProcesses(wsPage);
    await wsPage.executeCommand('Developer: Reload Window');
    await outputview.checkIfEngineStarted();
    const numOfJavaProcessesAfter = await readNumberOfJavaProcesses(wsPage);
    expect(numOfJavaProcessesBefore).toBe(numOfJavaProcessesAfter);
  });

  const readNumberOfJavaProcesses = async (wsPage: WorkspacePage) => {
    // make sure we wait for the processes to terminate before checking again, so read the number of processes until it is stable for 2 seconds
    let numOfJavaProcesses = -1;
    while (true) {
      const output = execSync('jps -q', { encoding: 'utf8' }).trim();
      const newValue = output ? output.split(/\r?\n/).length : 0;
      if (newValue === numOfJavaProcesses) {
        return newValue;
      }
      numOfJavaProcesses = newValue;
      await wsPage.page.waitForTimeout(2_000);
    }
  };
});

test.describe('Engine noProjectWorkspacePath', () => {
  test.use({ workspace: noProjectWorkspacePath });

  test('check default engine settings and ensure engine is started even if no projects in workspace', async ({ wsPage }) => {
    const settingsView = new SettingsView(wsPage);
    await settingsView.openDefaultSettings();
    await settingsView.containsSetting('"axonivy.engine.runByExtension": true');
    await settingsView.containsSetting('"axonivy.engine.releaseTrain": ""');
    await settingsView.containsSetting('"axonivy.engine.url": "http://localhost:8080/"');
    await settingsView.containsSetting('"axonivy.project.excludePattern": "**/target/**"');
    await settingsView.containsSetting('"axonivy.process.animation.animate": true');
    await settingsView.containsSetting('"axonivy.process.animation.mode": "all"');
    await settingsView.containsSetting('"axonivy.process.animation.speed": 50');

    await settingsView.openWorkspaceSettings();
    await settingsView.containsSetting('"axonivy.engine.runByExtension": true');
    const outputview = new OutputView(wsPage);
    await outputview.checkIfEngineStarted();
  });
});

test.describe('Engine noEngineWorkspacePath', () => {
  test.use({ workspace: noEngineWorkspacePath });

  test('ensure that engine is not started due to settings', async ({ wsPage }) => {
    const settingsView = new SettingsView(wsPage);
    await expect(wsPage.page.locator('li.action-item.checked').getByLabel('Explorer').first()).toBeVisible();
    await settingsView.openWorkspaceSettings();
    await settingsView.containsSetting('"axonivy.engine.runByExtension": false');
    await settingsView.containsSetting('"axonivy.engine.url": "http://localhost:8080/"');
    const outputview = new OutputView(wsPage);
    await expect(outputview.view).toBeHidden();
  });

  test('switch release train', async ({ wsPage }) => {
    const settingsView = new SettingsView(wsPage);
    await settingsView.openWorkspaceSettings();
    await settingsView.doesNotContainSetting('"axonivy.engine.releaseTrain":');
    await wsPage.executeCommand('Axon Ivy: Switch Engine Release Train');
    await wsPage.selectItemFromQuickPick('nightly');
    await settingsView.containsSetting('"axonivy.engine.releaseTrain": "nightly');
    await expect(wsPage.page.locator('div.quick-input-widget')).toContainText('Engine release train switched - reload window to apply new settings and restart the engine');
  });
});
