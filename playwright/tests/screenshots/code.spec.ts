import { expect, test } from '~/fixtures/baseTest';
import { ProjectExplorerView } from '~/page-objects/explorer-view';
import { WelcomePage } from '~/page-objects/welcome-page';
import { screenshotProject } from '~/workspaces/workspace';
import { screenshot, screenshotLocator } from './screenshot-util';

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

test('extensions', async ({ wsPage }) => {
  await wsPage.executeCommand('View: Show Extensions');
  const extensionsView = wsPage.page.locator('.extensions');
  await expect(extensionsView).toBeVisible();
  await screenshotLocator(wsPage.page, extensionsView, 'extensions', { marginLeft: 80, marginTop: 80, marginBottom: -200 });
});

test.describe('empty', () => {
  test.use({ workspace: null });

  test('empty workspace', async ({ wsPage }) => {
    await wsPage.executeCommand('Preferences: Toggle between Light/Dark Themes');
    await wsPage.executeCommand('View: Show Explorer');
    const welcomePage = new WelcomePage(wsPage);
    await welcomePage.open();
    const explorer = new ProjectExplorerView(wsPage);
    await explorer.openView();
    await screenshot(wsPage.page, 'empty-workspace');
  });
});
