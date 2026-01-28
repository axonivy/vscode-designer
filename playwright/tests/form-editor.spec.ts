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

  test('Extract component and jump', async ({ page }) => {
    await editor.locatorFor('.block-input').click();
    await editor.quickBar.getByRole('button', { name: /Add new Component/ }).click();
    await editor.quickBarMenu.getByRole('textbox').fill('Layout');
    await editor.quickBarMenu.locator('.ui-palette-item', { hasText: 'Layout' }).click();
    await page.keyboard.press('Escape');
    const layout = editor.locatorFor('.draggable:has(>.block-layout)');
    await expect(layout).toBeVisible();

    await layout.click();
    await editor.quickBar.getByRole('button', { name: /Extract/ }).click();
    const extractDialog = editor.viewFrameLocator().getByRole('dialog');
    await expect(extractDialog).toBeVisible();
    await extractDialog.getByLabel('Name', { exact: true }).fill('TestComponent');
    await extractDialog.getByRole('button', { name: 'Extract' }).click();
    await expect(extractDialog).toBeHidden();
    await expect(layout).toBeHidden();
    const composite = editor.locatorFor('.block-composite');
    await expect(composite).toBeVisible();

    await composite.click();
    await editor.quickBar.getByRole('button', { name: /Open Component/ }).click();
    const componentEditor = new FormEditor(page, 'TestComponent.f.json');
    await componentEditor.isTabVisible();
    await expect(componentEditor.locatorFor('.draggable:has(>.block-layout)')).toBeVisible();
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
