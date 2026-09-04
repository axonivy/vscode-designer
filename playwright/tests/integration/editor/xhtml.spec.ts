import { expect, test } from '~/fixtures/baseTest';
import { VsCodeBrowser } from '~/page-objects/vscode-browser';
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
  await wsPage.hasStatusMessage('Axon Ivy: Success: Invalidating class loader');
  await editor.expectDefinitionAtLineColumn('WorkflowBean.java', 24, 64);
  await editor.expectDefinitionAtLineColumn('IvyJsf.java', 24, 111);
  await editor.expectDefinitionAtLineColumn('IvyJsf.java', 24, 115);
  await editor.expectDefinitionAtLineColumn('ContentManagement.java', 24, 118);
});

test('xhtml preview', async ({ wsPage, electronApp }) => {
  const editor = new XhtmlEditor(wsPage);
  await editor.open();
  await wsPage.hasReadyStatusMessage();

  const timeout = { timeout: 3_000 };
  await wsPage.hasReadyStatusMessage();
  await wsPage.executeCommand('Axon Ivy: Deploy All Projects');
  await wsPage.hasStatusMessage('Axon Ivy: Success: Deploying projects');
  const vscodeBrowser = await VsCodeBrowser.openBrowser(() => wsPage.page.getByRole('button', { name: 'Open Dialog Preview' }).click(), {
    electronApp,
    page: wsPage.page
  });
  const frame = vscodeBrowser.browserPage.frameLocator('iframe');
  const button = frame.getByRole('button', { name: 'Proceed' });
  await expect(vscodeBrowser.browserPage.locator('#iFrameForm\\:frameTaskName')).toHaveText('Preview', timeout);
  await expect(async () => {
    await vscodeBrowser.reload();
    await expect(button).toBeVisible(timeout);
  }).toPass();

  await editor.close();

  const overlay = frame.locator('#selectionOverlay');
  await expect(overlay).toHaveCount(0);
  await vscodeBrowser.browserPage.locator('#iFrameForm\\:previewElementPicker').click();
  await expect(overlay).toHaveCount(1);
  await button.click();
  await expect(overlay).toHaveCount(1);
  await vscodeBrowser.browserPage.locator('#iFrameForm\\:previewElementPicker').click();
  await expect(overlay).toHaveCount(0);

  await editor.expectTabVisible();
  await expect(editor.content.locator('.active-line-number')).toHaveText('25');
});
