import { expect, test } from '../fixtures/baseTest';
import { BrowserView } from '../page-objects/browser-view';
import { XhtmlEditor } from '../page-objects/xhtml-editor';

let editor: XhtmlEditor;

test.beforeEach(async ({ page }) => {
  editor = new XhtmlEditor(page);
  await editor.openEditorFile();
});

test('xhtml completions', async () => {
  await editor.expectCompletionAtLineColumn('p:media', 20, 16);
  await editor.expectCompletionAtLineColumn('rendered', 20, 23);
  await editor.expectCompletionAtLineColumn('h:body', 19, 10);
});

test('xhtml definitions', async ({ wsPage }) => {
  await wsPage.activateExpensiveJavaStandardMode();
  await editor.expectDefinitionAtLineColumn('WorkflowBean.java', 24, 64);
  await editor.expectDefinitionAtLineColumn('IvyJsf.java', 24, 111);
  await editor.expectDefinitionAtLineColumn('IvyJsf.java', 24, 115);
  await editor.expectDefinitionAtLineColumn('ContentManagement.java', 24, 118);
});

test('xhtml preview', async ({ page, wsPage }) => {
  await wsPage.activateExpensiveJavaStandardMode();
  await editor.executeCommand('Axon Ivy: Deploy all Projects');
  await wsPage.hasStatusMessage('Axon Ivy: Success: Deploying projects');
  await wsPage.hasReadyStatusMessage();
  const browserView = new BrowserView(page);
  await browserView.openDevWfUi();
  const browser = browserView.content();
  await expect(browser.locator('.layout-topbar-logo')).toBeVisible();
  await browserView.moveToSecondaryPanel();

  await editor.executeCommand('Axon Ivy: Open Dialog Preview');
  const frame = browser.frameLocator('iframe');
  const button = frame.getByRole('button', { name: 'Proceed' });
  await expect(button).toBeVisible();

  await wsPage.closeAllTabs();

  const overlay = frame.locator('#selectionOverlay');
  await expect(overlay).toHaveCount(0);
  await browser.locator('#iFrameForm\\:previewElementPicker').click();
  await expect(overlay).toHaveCount(1);
  await button.click();
  await expect(overlay).toHaveCount(1);
  await browser.locator('#iFrameForm\\:previewElementPicker').click();
  await expect(overlay).toHaveCount(0);

  await editor.isTabVisible();
  await expect(editor.editorContent().locator('.active-line-number')).toHaveText('25');
});
