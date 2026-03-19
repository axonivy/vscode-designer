import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { OutputView } from '../page-objects/output-view';
import { RestClientEditor } from '../page-objects/restclient-editor';

test.describe('REST Client Editor', () => {
  let editor: RestClientEditor;

  test.beforeEach(async ({ page }) => {
    editor = new RestClientEditor(page);
  });

  test('Read, write', async () => {
    await editor.hasDeployProjectStatusMessage();
    await editor.openEditorFile();
    await editor.isTabVisible();
    await editor.isViewVisible();

    await expect(editor.rows.first()).toHaveText('personService{ivy.app.baseurl}/api/persons');
    await editor.rows.first().click();
    await editor.detail.getByRole('textbox', { name: 'Description' }).fill('my cool description');
    await editor.isDirty();
    await editor.saveAllFiles();
    await editor.isNotDirty();
    await editor.executeCommand('View: Reopen Editor With Text Editor');
    await expect(editor.editorContent()).toContainText('#my cool description');
  });

  test('OpenAPI codegen', async () => {
    await editor.hasDeployProjectStatusMessage();
    await editor.openEditorFile();
    await editor.isTabVisible();
    await editor.isViewVisible();

    await editor.main.getByText('openApiService').click();
    await editor.main.getByRole('button', { name: 'Generate an OpenAPI client' }).click();
    const generator = editor.viewFrameLocator().getByRole('button', { name: 'Generate' });
    await generator.isEnabled();
    await generator.click();

    const successToast = editor
      .toasts()
      .filter({ hasText: /openApiService OpenAPI client generation succeeded/i })
      .first();
    await expect(successToast).toBeVisible();
  });

  test('Open Help', async ({ page }) => {
    await editor.openEditorFile();
    const outputView = new OutputView(page);
    await outputView.openLog('Axon Ivy Extension');

    await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
    await page.keyboard.press('Escape');
    await outputView.expectLogEntry('Opening URL externally');
    await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*configuration\/rest-clients\.html/);
  });
});
