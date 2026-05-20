import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { OutputView } from '~/page-objects/output-view';
import { WebServiceClientEditor } from '~/page-objects/webservice-client-editor';

test('Read, write', async ({ wsPage }) => {
  const editor = new WebServiceClientEditor(wsPage);
  await editor.open();

  await expect(editor.rows.first()).toContainText('personService');
  await editor.rows.first().click();
  await editor.detail.getByRole('textbox', { name: 'Description' }).fill('my cool description');
  await editor.save();
  await editor.expectTextContent('#my cool description');
});

test('Webservice codegen', async ({ wsPage }) => {
  const editor = new WebServiceClientEditor(wsPage);
  await editor.open();

  await editor.main.getByText('personService', { exact: true }).click();
  await editor.main.getByRole('button', { name: /Generate Service/i }).click();
  const generator = editor.webViewFrame.getByRole('button', { name: /^Generate$/i });
  await expect(generator).toBeEnabled();
  await generator.click();

  const successToast = wsPage
    .toasts
    .filter({ hasText: /personService web service client generation succeeded/i })
    .first();
  await expect(successToast).toBeVisible();
});

test('Open Help', async ({ wsPage }) => {
  const editor = new WebServiceClientEditor(wsPage);
  await editor.open();
  const outputView = new OutputView(wsPage.page);
  await outputView.openLog('Axon Ivy Extension');

  await editor.webViewFrame.getByRole('button', { name: /Help/ }).click();
  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*configuration\/web.?service-clients\.html/);
});
