import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { OutputView } from '../page-objects/output-view';
import { RestClientEditor } from '../page-objects/restclient-editor';

test.describe('REST Client Editor', () => {
  test('Read, write', async ({ page }) => {
    const editor = new RestClientEditor(page);
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

  test('OpenAPI codegen', async ({ page }) => {
    const editor = new RestClientEditor(page);
    await editor.hasDeployProjectStatusMessage();
    await editor.openEditorFile();
    await editor.isTabVisible();
    await editor.isViewVisible();

    await editor.main.getByText('openApiService').click();
    await editor.main.getByRole('button', { name: 'Generate an OpenAPI client' }).click();
    const generator = editor.viewFrameLocator().getByRole('button', { name: 'Generate' });
    await generator.isEnabled();
    await generator.click();

    await expect(page.getByRole('textbox', { name: /Generate OpenAPI Client/i })).toBeVisible();
    await expect(page.locator('div.terminal-wrapper.active')).toContainText('mvn com.axonivy.ivy.tool.rest:openapi-codegen:generate-openapi-client');
    await expect(page.locator('div.terminal-wrapper.active')).toContainText('[INFO] BUILD SUCCESS', { timeout: 30000 });
  });

  test('Open Help', async ({ page }) => {
    const editor = new RestClientEditor(page);
    await editor.openEditorFile();
    const outputView = new OutputView(page);
    await outputView.openLog('Axon Ivy Extension');

    await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
    await page.keyboard.press('Escape');
    await outputView.expectLogEntry('Opening URL externally');
    await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*configuration\/rest-clients\.html/);
  });
});
