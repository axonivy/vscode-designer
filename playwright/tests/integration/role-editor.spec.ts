import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { OutputView } from '../page-objects/output-view';
import { RoleEditor } from '../page-objects/role-editor';

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
});

test('Open Help', async ({ page }) => {
  const editor = new RoleEditor(page);
  await editor.openEditorFile();
  const outputView = new OutputView(page);
  await outputView.openLog('Axon Ivy Extension');

  await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
  await page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*configuration\/roles-users\.html/);
});
