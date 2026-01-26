import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { BrowserView } from './page-objects/browser-view';
import { RoleEditor } from './page-objects/role-editor';

test('Read, write and open help', async ({ page }) => {
  const editor = new RoleEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isTabVisible();
  await editor.isViewVisible();

  await expect(editor.rows.first()).toHaveText('EmployeeManagerTeamleader');
  await editor.rows.first().click();
  await editor.detail.getByRole('textbox', { name: 'Display Name' }).fill('my new display name');
  await editor.isDirty();
  await editor.saveAllFiles();
  await editor.isNotDirty();
  await editor.executeCommand('View: Reopen Editor With Text Editor');
  await expect(editor.editorContent()).toContainText('Name: my new display name');

  await editor.executeCommand('View: Reopen Editor With...', 'Axon Ivy Roles Editor');
  const browserView = new BrowserView(page);
  await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
  const helpLink = await browserView.input().inputValue();
  expect(helpLink).toMatch(/^https:\/\/developer\.axonivy\.com.*configuration\/roles-users\.html$/);
});
