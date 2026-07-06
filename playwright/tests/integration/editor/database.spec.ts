import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { DatabaseEditor } from '~/page-objects/database-editor';
import { OutputView } from '~/page-objects/output-view';

test('Read, write', async ({ wsPage }) => {
  const editor = new DatabaseEditor(wsPage);
  await editor.open();

  await expect(editor.rows.first()).toContainText('demo_dblocalhost:3306mySQL');
  await editor.rows.first().click();
  await editor.detail.getByRole('textbox', { name: 'Host' }).fill('127.0.0.1');
  await editor.save();
  await editor.expectTextContent('Url: jdbc:mysql://127.0.0.1:3306/demo');
});

test('Open help', async ({ wsPage }) => {
  const editor = new DatabaseEditor(wsPage);
  await editor.open();
  const outputView = new OutputView(wsPage);
  await outputView.openLog('Axon Ivy Extension');

  await editor.webViewFrame.getByRole('button', { name: /Help/ }).click();
  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com\/.*\/databases\.html#database-editor/);
});
