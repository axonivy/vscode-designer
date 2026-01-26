import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { BrowserView } from './page-objects/browser-view';
import { UserEditor } from './page-objects/user-editor';

test('Read, write and open help', async ({ page }) => {
  const editor = new UserEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isTabVisible();
  await editor.isViewVisible();

  await expect(editor.rows.first()).toHaveText('wtWilliam TellTeamleader');
  await editor.rows.first().click();
  await editor.detail.getByRole('textbox', { name: 'Full Name' }).fill('my new full name');
  await editor.isDirty();
  await editor.saveAllFiles();
  await editor.isNotDirty();
  await editor.executeCommand('View: Reopen Editor With Text Editor');
  await expect(editor.editorContent()).toContainText('FullName: my new full name');

  await editor.executeCommand('View: Reopen Editor With...', 'Axon Ivy User Editor');
  const browserView = new BrowserView(page);
  await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
  const helpLink = await browserView.input().inputValue();
  expect(helpLink).toMatch(/^https:\/\/developer\.axonivy\.com.*configuration\/roles-users\.html$/);
});
