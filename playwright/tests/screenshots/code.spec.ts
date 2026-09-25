import { expect, test } from '~/fixtures/baseTest';
import { ProjectExplorerView } from '~/page-objects/explorer-view';
import { screenshotProject } from '~/workspaces/workspace';
import { screenshotLocator } from './screenshot-util';

test.use({ workspace: screenshotProject });

test('command palette', async ({ wsPage, page }) => {
  await page.keyboard.press('ControlOrMeta+KeyP');
  await expect(wsPage.quickInputBox.locator('input.input')).toBeVisible();
  await wsPage.quickInputBox.locator('input.input').fill('> Axon Ivy:');
  await expect(wsPage.quickInputList.getByRole('option').first()).toContainText('Axon Ivy:');
  await screenshotLocator(wsPage.page, wsPage.quickInputWidget, 'command-palette');
});

test('notifications', async ({ wsPage }) => {
  await wsPage.executeCommand('Notifications: Show Notifications');
  await expect(wsPage.notificationsCenter).toBeVisible();
  await screenshotLocator(wsPage.page, wsPage.notificationsCenter, 'notifications');
});

test('status-bar', async ({ wsPage }) => {
  await wsPage.hasReadyStatusMessage();
  await wsPage.ivyStatusBar.hover();
  const hoverContents = wsPage.page.locator('.hover-contents');
  await expect(hoverContents).toBeVisible();
  await expect(hoverContents).toContainText('Axon Ivy Engine Status - Connected');
  await screenshotLocator(wsPage.page, hoverContents, 'status-bar', { marginBottom: 40 });
});

test('settings', async ({ wsPage }) => {
  await wsPage.executeCommand('Preferences: Open Workspace Settings');
  const settingsEditor = wsPage.page.locator('.settings-editor');
  await expect(settingsEditor).toBeVisible();
  await screenshotLocator(wsPage.page, settingsEditor, 'settings', { marginTop: 40 });
});

test('profiles', async ({ wsPage }) => {
  await wsPage.executeCommand('Preferences: Open Profiles');
  const profileEditor = wsPage.page.locator('.profiles-editor');
  await expect(profileEditor).toBeVisible();
  await screenshotLocator(wsPage.page, profileEditor, 'profiles', { marginTop: 60 });
});

test('axonivy tree view', async ({ wsPage }) => {
  const explorer = new ProjectExplorerView(wsPage);
  await explorer.openView();
  await expect(explorer.view.getByText('playwrightTestWorkspace')).toBeVisible();
  await screenshotLocator(wsPage.page, explorer.view, 'axonivy-tree-view', { marginTop: 40 });
});
