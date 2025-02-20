import { expect } from '@playwright/test';
import { OutputView } from './page-objects/output-view';
import { embeddedEngineWorkspace, noEngineWorkspacePath, noProjectWorkspacePath } from './workspaces/workspace';
import { SettingsView } from './page-objects/settings-view';
import { test } from './fixtures/baseTest';

test.describe('Engine embeddedEngineWorkspace', () => {
  test.use({ workspace: embeddedEngineWorkspace });
  test('check if embedded engine has started', async ({ page }) => {
    const outputview = new OutputView(page);
    await outputview.isTabVisible();
    await outputview.isChecked();
    await outputview.isViewVisible();
    await outputview.checkIfEngineStarted();
  });
});

test.describe('Engine noProjectWorkspacePath', () => {
  test.use({ workspace: noProjectWorkspacePath });
  test('check default engine settings', async ({ page }) => {
    const settingsView = new SettingsView(page);
    await settingsView.openDefaultSettings();
    await settingsView.containsSetting('"engine.runByExtension": true');
    await settingsView.containsSetting('"engine.directory": ""');
    await settingsView.containsSetting('"engine.url": "http://localhost:8080/"');
    await settingsView.containsSetting('"project.excludePattern": "**/target/**"');
    await settingsView.containsSetting('"process.animation.animate": true');
    await settingsView.containsSetting('"process.animation.mode": "all"');
    await settingsView.containsSetting('"process.animation.speed": 50');
  });

  test('ensure that embedded engine is not started due to missing project file', async ({ page }) => {
    const settingsView = new SettingsView(page);
    await settingsView.openWorkspaceSettings();
    await settingsView.containsSetting('"engine.runByExtension": true');
    const outputview = new OutputView(page);
    await expect(outputview.viewLocator).toBeHidden();
  });
});

test.describe('Engine noEngineWorkspacePath', () => {
  test.use({ workspace: noEngineWorkspacePath });
  test('ensure that embedded engine is not started due to settings', async ({ page }) => {
    const settingsView = new SettingsView(page);
    await settingsView.isExplorerActionItemChecked();
    await settingsView.openWorkspaceSettings();
    await settingsView.containsSetting('"engine.runByExtension": false');
    await settingsView.containsSetting('"engine.url": "http://localhost:8080/"');
    const outputview = new OutputView(page);
    await expect(outputview.viewLocator).toBeHidden();
  });
});
