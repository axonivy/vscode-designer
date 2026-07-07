import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { OutputView } from '~/page-objects/output-view';
import { RestClientEditor } from '~/page-objects/restclient-editor';

test('Read, write', async ({ wsPage }) => {
  const editor = new RestClientEditor(wsPage);
  await editor.open();

  await expect(editor.rows.first()).toHaveText('personService{ivy.app.baseurl}/api/persons');
  await editor.rows.first().click();
  await editor.detail.getByRole('textbox', { name: 'Description' }).fill('my cool description');
  await editor.save();
  await editor.expectTextContent('#my cool description');
});

test('OpenAPI codegen', async ({ wsPage }) => {
  const editor = new RestClientEditor(wsPage);
  await editor.open();

  await editor.main.getByText('openApiService').click();
  await editor.main.getByRole('button', { name: 'Generate an OpenAPI client' }).click();
  const generator = editor.webViewFrame.getByRole('button', { name: 'Generate' });
  await generator.isEnabled();
  await generator.click();

  const successToast = wsPage.toasts.filter({ hasText: /openApiService OpenAPI client generated successfully/i }).first();
  await expect(successToast).toBeVisible();
});

test('Open Help', async ({ wsPage }) => {
  const editor = new RestClientEditor(wsPage);
  await editor.open();
  const outputView = new OutputView(wsPage);
  await outputView.openLog('Axon Ivy Extension');

  await editor.webViewFrame.getByRole('button', { name: /Help/ }).click();
  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*configuration\/rest-clients\.html/);
});
