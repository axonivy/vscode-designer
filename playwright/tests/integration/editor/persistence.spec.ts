import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { OutputView } from '~/page-objects/output-view';
import { PersistenceEditor } from '~/page-objects/persistence-editor';

test('Read, write', async ({ wsPage }) => {
  const editor = new PersistenceEditor(wsPage);
  await editor.open();

  await expect(editor.rows.first()).toHaveText('TestPUIvySystemDatabase');
  await editor.rows.first().click();
  await editor.detail.getByRole('textbox', { name: 'Name' }).fill('myCoolPU');
  await editor.save();
  await editor.expectTextContent('myCoolPU:');
});

test('Open Help', async ({ wsPage }) => {
  const editor = new PersistenceEditor(wsPage);
  await editor.open();
  const outputView = new OutputView(wsPage.page);
  await outputView.openLog('Axon Ivy Extension');

  await editor.webViewFrame.getByRole('button', { name: /Help/ }).click();
  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*data-modeling\/persistence\/persistence-configuration-editor\.html/);
});
