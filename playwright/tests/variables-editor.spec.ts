import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { BrowserView } from './page-objects/browser-view';
import { VariablesEditor } from './page-objects/variables-editor';

test('Read, write and open help', async ({ page }) => {
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

  await editor.executeCommand('View: Reopen Editor With...', 'Axon Ivy Variables Editor');
  const browserView = new BrowserView(page);
  await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
  const helpLink = await browserView.input().inputValue();
  expect(helpLink).toMatch(/^https:\/\/developer\.axonivy\.com.*configuration\/variables\.html$/);
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
