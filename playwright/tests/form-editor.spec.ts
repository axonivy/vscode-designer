import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { BrowserView } from './page-objects/browser-view';
import { FormEditor } from './page-objects/form-editor';

test.describe('Form Editor', () => {
  let editor: FormEditor;

  test.beforeEach(async ({ page }) => {
    editor = new FormEditor(page);
    await editor.hasDeployProjectStatusMessage();
    await editor.openEditorFile();
    await editor.isViewVisible();
  });

  test('Edit input label', async ({ page }) => {
    const text = editor.locatorFor('.block-text');
    await expect(text).toBeVisible();
    await expect(text).toHaveText('This is my test');
    await editor.isNotDirty();

    const input = editor.locatorFor('.block-input');
    await input.dblclick();
    const labelProperty = editor.locatorFor('#properties').getByLabel('Label');
    const newLabel = 'newTestLabel';
    await labelProperty.click();
    await labelProperty.fill(newLabel);
    await labelProperty.blur();
    await expect(input).toHaveText(newLabel);
    await editor.isDirty();
    await editor.saveAllFiles();
    await editor.isNotDirty();
    const xhtmlEditor = new FormEditor(page, 'testForm.xhtml');
    await xhtmlEditor.openEditorFile();
    await xhtmlEditor.isTabVisible();
    await expect(xhtmlEditor.editorContent()).toContainText(`value="${newLabel}" />`);
    await xhtmlEditor.revertAndCloseEditor();
  });

  test('Open Help', async ({ page }) => {
    const browserView = new BrowserView(page);
    await editor.locatorFor('.block-input').dblclick();
    const inscriptionView = editor.locatorFor('#properties');
    await inscriptionView.getByRole('button', { name: /Help/ }).click();
    expect((await browserView.input().inputValue()).toString()).toMatch(/^https:\/\/developer\.axonivy\.com.*user-dialogs\/form-editor\.html$/);
  });

  test('Preview', async ({ page }) => {
    const browserView = new BrowserView(page);
    await browserView.openDevWfUi();
    const browser = browserView.content();
    await expect(browser.getByRole('menuitem', { name: /Home/ })).toBeVisible();
    await editor.executeCommand('View: Move Panel Right');

    await expect(editor.locatorFor('.selected')).toHaveCount(0);
    await editor.toolbar.getByRole('button', { name: 'Open Preview' }).click();
    await expect(browser.locator('#iFrameForm\\:frameTaskName')).toHaveText('Preview');
    const frame = browser.frameLocator('iframe');
    const input = frame.getByRole('textbox');
    await expect(input).toBeVisible();

    await editor.closeAllTabs();

    const overlay = frame.locator('#selectionOverlay');
    await expect(overlay).toHaveCount(0);
    await browser.locator('#iFrameForm\\:previewElementPicker').click();
    await expect(overlay).toHaveCount(1);
    await input.click();
    await expect(overlay).toHaveCount(1);
    await browser.locator('#iFrameForm\\:previewElementPicker').click();
    await expect(overlay).toHaveCount(0);

    await editor.isViewVisible();
    await expect(editor.locatorFor('.selected')).toHaveCount(1);
  });
});
