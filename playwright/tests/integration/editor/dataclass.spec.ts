import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { DataClassEditor } from '~/page-objects/dataclass-editor';
import { OutputView } from '~/page-objects/output-view';
import { TextEditor } from '~/page-objects/text-editor';

test('Add attribute', async ({ wsPage }) => {
  const editor = new DataClassEditor(wsPage);
  await editor.open();

  await editor.webViewFrame.getByRole('button', { name: /Add Attribute/ }).click();
  const attributeName = 'testAttributeName';
  const dialog = editor.webViewFrame.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name' }).fill(attributeName);
  await dialog.getByRole('button', { name: 'Create Attribute' }).click();
  await expect(editor.webViewFrame.locator('table')).toContainText(attributeName);

  await editor.save();
  const javaEditor = new TextEditor(wsPage, 'DataClassEditorTest.java');
  await javaEditor.open();
  await expect(javaEditor.content).toContainText(`  private java.lang.String ${attributeName};`);
});

test('Type completion with JDT language server', async ({ wsPage }) => {
  test.setTimeout(60_000); // slow test due to java activation
  const editor = new DataClassEditor(wsPage);
  await editor.open();

  await wsPage.activateExpensiveJavaStandardMode();

  await editor.webViewFrame.getByRole('button', { name: /Add Attribute/ }).click();
  const dialog = editor.webViewFrame.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name' }).fill('testTask');
  await dialog.getByRole('button', { name: 'Browser' }).click();
  await dialog.getByRole('checkbox', { name: 'Search over all types' }).check();
  await dialog.getByRole('textbox').fill('ITask');
  await dialog.getByRole('table').getByRole('row', { name: 'ITask ch.ivyteam.ivy.workflow' }).click();
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog.getByRole('textbox', { name: 'Type' })).toHaveValue('ch.ivyteam.ivy.workflow.ITask');
  await dialog.getByRole('button', { name: 'Create Attribute' }).click();

  await editor.save();
});

test('Open help', async ({ wsPage }) => {
  const editor = new DataClassEditor(wsPage);
  const outputView = new OutputView(wsPage.page);
  await editor.open();
  await outputView.openLog('Axon Ivy Extension');

  await editor.webViewFrame.getByRole('button', { name: /Help/ }).click();
  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*data-classes\/data-classes.html#data-class-editor/);
});
