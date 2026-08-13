import { expect, test } from '~/fixtures/baseTest';
import { BrowserView } from '~/page-objects/browser-view';
import { XhtmlEditor } from '~/page-objects/xhtml-editor';

test('xhtml completions', async ({ wsPage }) => {
  const editor = new XhtmlEditor(wsPage);
  await editor.open();
  await editor.expectCompletionAtLineColumn('p:media', 20, 16);
  await editor.expectCompletionAtLineColumn('rendered', 20, 23);
  await editor.expectCompletionAtLineColumn('h:body', 19, 10);
});

test('xhtml definitions', async ({ wsPage }) => {
  const editor = new XhtmlEditor(wsPage);
  await editor.open();
  await wsPage.activateExpensiveJavaStandardMode();
  await editor.expectDefinitionAtLineColumn('WorkflowBean.java', 24, 64);
  await editor.expectDefinitionAtLineColumn('IvyJsf.java', 24, 111);
  await editor.expectDefinitionAtLineColumn('IvyJsf.java', 24, 115);
  await editor.expectDefinitionAtLineColumn('ContentManagement.java', 24, 118);
});

test('xhtml preview', async ({ wsPage }) => {
  const editor = new XhtmlEditor(wsPage);
  await editor.open();
  await wsPage.activateExpensiveJavaStandardMode();
  await wsPage.hasReadyStatusMessage();
  const browserView = new BrowserView(wsPage);
  const browser = browserView.content;

  const frame = browser.frameLocator('iframe');
  const button = frame.getByRole('button', { name: 'Proceed' });

  await expect(async () => {
    await wsPage.executeCommand('Axon Ivy: Deploy All Projects');
    await wsPage.hasStatusMessage('Axon Ivy: Success: Deploying projects');
    await wsPage.page.getByRole('button', { name: 'Open Dialog Preview' }).click();
    await expect(button).toBeVisible({ timeout: 3_000 });
  }).toPass();

  await wsPage.closeAllTabs();

  const overlay = frame.locator('#selectionOverlay');
  await expect(overlay).toHaveCount(0);
  await browser.locator('#iFrameForm\\:previewElementPicker').click();
  await expect(overlay).toHaveCount(1);
  await button.click();
  await expect(overlay).toHaveCount(1);
  await browser.locator('#iFrameForm\\:previewElementPicker').click();
  await expect(overlay).toHaveCount(0);

  await editor.expectTabVisible();
  await expect(editor.content.locator('.active-line-number')).toHaveText('25');
});
