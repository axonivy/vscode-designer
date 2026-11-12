import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { OutputView } from '../page-objects/output-view';
import { SettingsView } from '../page-objects/settings-view';
import { embeddedEngineWorkspace, minimalProjectWorkspacePath } from '../workspaces/workspace';

test.describe('Engine started by extension', () => {
  test.use({ workspace: embeddedEngineWorkspace });

  test('Engine is terminated with extension reload', { tag: '@serial' }, async ({ wsPage }) => {
    const outputview = new OutputView(wsPage);
    await outputview.checkIfEngineStarted();
    const engineUrl = await outputview.getEngineUrl();
    expect(engineUrl).toBeDefined();
    expect(engineUrl?.startsWith('http')).toBeTruthy();
    const engineResponse = await fetch(engineUrl!);
    expect(engineResponse.ok).toBeTruthy();
    await wsPage.executeCommand('Developer: Reload Window');
    await expect(async () => {
      await expect(fetch(engineUrl!)).rejects.toThrow();
    }).toPass({ intervals: [200] });
    await outputview.checkIfEngineStarted();

    const settingsView = new SettingsView(wsPage);
    await settingsView.openDefaultSettings();
    await settingsView.containsSetting('"axonivy.engine.runByExtension": true');
    await settingsView.containsSetting('"axonivy.engine.releaseTrain": ""');
    await settingsView.containsSetting('"axonivy.engine.url": "http://localhost:8080/"');
    await settingsView.containsSetting('"axonivy.project.excludePattern": "**/{target,bin}/**"');
    await settingsView.containsSetting('"axonivy.process.animation.animate": true');
    await settingsView.containsSetting('"axonivy.process.animation.mode": "all"');
    await settingsView.containsSetting('"axonivy.process.animation.speed": 50');

    await settingsView.openWorkspaceSettings();
    await settingsView.containsSetting('"axonivy.engine.runByExtension": true');
  });
});

test.describe('Engine not started by extension', () => {
  test.use({ workspace: minimalProjectWorkspacePath });

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
    await wsPage.selectItemFromQuickPick('nightly-14');
    await settingsView.containsSetting('"axonivy.engine.releaseTrain": "nightly-14');
    await expect(wsPage.page.locator('div.quick-input-widget')).toContainText('Engine release train switched - reload window to apply new settings and restart the engine');
  });
});
