import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { OutputView } from './page-objects/output-view';
import { VariablesEditor } from './page-objects/variables-editor';

test('Read, write', async ({ page }) => {
  const editor = new VariablesEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isTabVisible();
  await editor.isViewVisible();

  await editor.hasKey('originalKey');
  await editor.hasValue('originalValue', false);
  const newValue = 'newTestValue';
  await editor.selectFirstRow();
  await editor.updateValue(newValue);
  await editor.isDirty();
  await editor.saveAllFiles();
  await editor.isNotDirty();
  await editor.executeCommand('View: Reopen Editor With Text Editor');
  await expect(editor.editorContent()).toContainText(`originalKey: ${newValue}`);
});

test('Not possible to open multiple dialogs using shortcut', async ({ page }) => {
  const editor = new VariablesEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isTabVisible();
  await editor.isViewVisible();

  await editor.page.keyboard.press('a');

  const addDialog = editor.viewFrameLocator().getByRole('dialog', { name: 'Add Variable' });
  await addDialog.focus();
  await editor.page.keyboard.press('i');

  await expect(addDialog).toBeVisible();
  await expect(editor.viewFrameLocator().getByRole('dialog', { name: 'Import Variable' })).toBeHidden();
});

test('Open Help', async ({ page }) => {
  const editor = new VariablesEditor(page);
  await editor.openEditorFile();
  const outputView = new OutputView(page);
  await outputView.openLog('Axon Ivy Extension');

  await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
  await page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*configuration\/variables\.html/);
});
