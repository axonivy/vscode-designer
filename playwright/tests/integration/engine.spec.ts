import { expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import Os from 'os';
import { test } from '../fixtures/baseTest';
import { OutputView } from '../page-objects/output-view';
import { SettingsView } from '../page-objects/settings-view';
import { embeddedEngineWorkspace, noEngineWorkspacePath, noProjectWorkspacePath } from '../workspaces/workspace';

// eslint-disable-next-line playwright/no-focused-test
test.describe.only('Engine run by extension', () => {
  test.use({ workspace: embeddedEngineWorkspace });

  test('check if extension can download and start engine', async ({ wsPage }) => {
    const outputview = new OutputView(wsPage);
    await outputview.checkIfEngineStarted();
  });

  test('Java processes are terminated with extension reload', { tag: '@serial' }, async ({ wsPage }) => {
    const outputview = new OutputView(wsPage);
    await outputview.checkIfEngineStarted();
    await checkNumberOfJavaProcesses();
    await wsPage.executeCommand('Developer: Reload Window');
    await outputview.checkIfEngineStarted();
    await checkNumberOfJavaProcesses();
  });

  const checkNumberOfJavaProcesses = async () => {
    const numberOfExpectedJavaProcesses = Os.platform() === 'win32' ? 6 : 5;
    await expect(async () => {
      const output = execSync('jps -q', { encoding: 'utf8' }).trim();
      const numOfJavaProcesses = output ? output.split(/\r?\n/).length : 0;
      expect(numOfJavaProcesses).toBe(numberOfExpectedJavaProcesses);
    }).toPass();
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
