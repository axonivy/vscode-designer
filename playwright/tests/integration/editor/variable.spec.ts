import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { OutputView } from '~/page-objects/output-view';
import { VariablesEditor } from '~/page-objects/variables-editor';

test('Read, write', async ({ wsPage }) => {
  const editor = new VariablesEditor(wsPage);
  await editor.open();

  await editor.hasKey('originalKey');
  await editor.hasValue('originalValue', false);
  const newValue = 'newTestValue';
  await editor.selectFirstRow();
  await editor.updateValue(newValue);
  await editor.save();
  await editor.expectTextContent(`originalKey: ${newValue}`);
});

test('Not possible to open multiple dialogs using shortcut', async ({ wsPage }) => {
  const editor = new VariablesEditor(wsPage);
  await editor.open();

  await editor.webViewFrame.getByRole('button', { name: /Add Variable/ }).press('KeyA');
  const addDialog = editor.webViewFrame.getByRole('dialog', { name: 'Add Variable' });
  await addDialog.press('KeyI');

  await expect(addDialog).toBeVisible();
  await expect(editor.webViewFrame.getByRole('dialog', { name: 'Import Variable' })).toBeHidden();
});

test('Open Help', async ({ wsPage }) => {
  const editor = new VariablesEditor(wsPage);
  await editor.open();
  const outputView = new OutputView(wsPage.page);
  await outputView.openLog('Axon Ivy Extension');

  await editor.webViewFrame.getByRole('button', { name: /Help/ }).click();
  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*configuration\/variables\.html/);
});
