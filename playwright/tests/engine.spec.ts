import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { OutputView } from './page-objects/output-view';
import { SettingsView } from './page-objects/settings-view';
import { embeddedEngineWorkspace, noEngineWorkspacePath, noProjectWorkspacePath } from './workspaces/workspace';

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
    await settingsView.containsSetting('"axonivy.engine.runByExtension": true');
    await settingsView.containsSetting('"axonivy.engine.releaseTrain": ""');
    await settingsView.containsSetting('"axonivy.engine.url": "http://localhost:8080/"');
    await settingsView.containsSetting('"axonivy.project.excludePattern": "**/target/**"');
    await settingsView.containsSetting('"axonivy.process.animation.animate": true');
    await settingsView.containsSetting('"axonivy.process.animation.mode": "all"');
    await settingsView.containsSetting('"axonivy.process.animation.speed": 50');
  });

  test('ensure that embedded engine is not started due to missing project file', async ({ page }) => {
    const settingsView = new SettingsView(page);
    await settingsView.openWorkspaceSettings();
    await settingsView.containsSetting('"axonivy.engine.runByExtension": true');
    const outputview = new OutputView(page);
    await expect(outputview.viewLocator).toBeHidden();
  });

  test('switch release train', async ({ page }) => {
    const settingsView = new SettingsView(page);
    await settingsView.openWorkspaceSettings();
    await settingsView.doesNotContainSetting('"axonivy.engine.releaseTrain":');
    await settingsView.executeCommand('Axon Ivy: Switch Engine Release Train');
    await settingsView.page.locator('div.quick-input-list').locator('div.monaco-icon-label-container').filter({ hasText: 'nightly' }).first().click();
    await settingsView.containsSetting('"axonivy.engine.releaseTrain": "nightly');
    await expect(page.locator('div.quick-input-widget')).toContainText('Engine release train switched - reload window to apply new settings and restart the engine');
  });
});

test.describe('Engine noEngineWorkspacePath', () => {
  test.use({ workspace: noEngineWorkspacePath });

  test('ensure that embedded engine is not started due to settings', async ({ page }) => {
    const settingsView = new SettingsView(page);
    await settingsView.isExplorerActionItemChecked();
    await settingsView.openWorkspaceSettings();
    await settingsView.containsSetting('"axonivy.engine.runByExtension": false');
    await settingsView.containsSetting('"axonivy.engine.url": "http://localhost:8080/"');
    const outputview = new OutputView(page);
    await expect(outputview.viewLocator).toBeHidden();
  });
});
