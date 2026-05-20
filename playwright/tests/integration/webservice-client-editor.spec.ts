import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { OutputView } from '../page-objects/output-view';
import { WebServiceClientEditor } from '../page-objects/webservice-client-editor';

test('Read, write', async ({ page }) => {
  const editor = new WebServiceClientEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isTabVisible();
  await editor.isViewVisible();

  await expect(editor.rows.first()).toContainText('personService');
  await editor.rows.first().click();
  await editor.detail.getByRole('textbox', { name: 'Description' }).fill('my cool description');
  await editor.isDirty();
  await editor.saveAllFiles();
  await editor.isNotDirty();
  await editor.executeCommand('View: Reopen Editor With Text Editor');
  await expect(editor.editorContent()).toContainText('#my cool description');
});

test('Webservice codegen', async ({ page }) => {
  const editor = new WebServiceClientEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isTabVisible();
  await editor.isViewVisible();

  await editor.main.getByText('personService', { exact: true }).click();
  await editor.main.getByRole('button', { name: /Generate Service/i }).click();
  const generator = editor.viewFrameLocator().getByRole('button', { name: /^Generate$/i });
  await expect(generator).toBeEnabled();
  await generator.click();

  // const successToast = editor
  //   .toasts()
  //   .filter({ hasText: /personService web service client generation succeeded/i })
  //   .first();
  // await expect(successToast).toBeVisible();
});

test('Open Help', async ({ page }) => {
  const editor = new WebServiceClientEditor(page);
  await editor.openEditorFile();
  const outputView = new OutputView(page);
  await outputView.openLog('Axon Ivy Extension');

  await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
  await page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*configuration\/web.?service-clients\.html/);
});
