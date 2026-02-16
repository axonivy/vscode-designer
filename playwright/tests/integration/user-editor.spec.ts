import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { OutputView } from '../page-objects/output-view';
import { UserEditor } from '../page-objects/user-editor';

test('Read, write', async ({ page }) => {
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
});

test('Open Help', async ({ page }) => {
  const editor = new UserEditor(page);
  await editor.openEditorFile();
  const outputView = new OutputView(page);
  await outputView.openLog('Axon Ivy Extension');

  await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
  await page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*configuration\/roles-users\.html/);
});
