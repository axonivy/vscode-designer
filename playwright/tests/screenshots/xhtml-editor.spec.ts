import { expect, test } from '~/fixtures/baseTest';
import { VsCodeBrowser } from '~/page-objects/vscode-browser';
import { XhtmlEditor } from '~/page-objects/xhtml-editor';
import { screenshotProject } from '~/workspaces/workspace';
import { screenshot, screenshotLocator } from './screenshot-util';

test.use({ workspace: screenshotProject });

test('xhtml editor preview', async ({ wsPage, electronApp }) => {
  const editor = new XhtmlEditor(wsPage, 'DemoDialog.xhtml');
  await editor.open();

  const timeout = { timeout: 3_000 };
  await wsPage.executeCommand('Axon Ivy: Deploy All Projects');
  await wsPage.statusMessageContains('Axon Ivy: Success: Deploying project');
  const vscodeBrowser = await VsCodeBrowser.openBrowser(() => wsPage.executeCommand('Axon Ivy: Open Dialog Preview'), { electronApp });
  await expect(vscodeBrowser.browserPage.locator('#iFrameForm\\:frameTaskName')).toHaveText('Preview', timeout);

  await expect(async () => {
    await vscodeBrowser.reload();
    await expect(vscodeBrowser.browserPage.frameLocator('iframe').getByRole('textbox')).toBeVisible(timeout);
  }).toPass();

  await new Promise(resolve => setTimeout(resolve, 1000)); // wait for the preview to be fully rendered
  await screenshot(wsPage.page, 'editor-xhtml-preview');
});

test('hover', async ({ wsPage }) => {
  const editor = new XhtmlEditor(wsPage, 'DemoDialog.xhtml');
  await editor.open();

  const hover = wsPage.page.locator('.monaco-hover');
  await expect(async () => {
    await editor.goToLineColumn(32, 76);
    await wsPage.page.keyboard.press('Control+K');
    await wsPage.page.keyboard.press('Control+I');
    await expect(hover).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await screenshotLocator(wsPage.page, hover, 'editor-xhtml-hover', { margin: 30 });
});

test('completions', async ({ wsPage }) => {
  const editor = new XhtmlEditor(wsPage, 'DialogWithError.xhtml');
  await editor.open();

  await editor.goToLineColumn(13, 36);
  await wsPage.page.keyboard.press('Control+Space');
  await expect(editor.completions).toBeVisible();
  await screenshotLocator(wsPage.page, editor.completions, 'editor-xhtml-completions', { margin: 30 });
});

test('code actions', async ({ wsPage }) => {
  const editor = new XhtmlEditor(wsPage, 'DialogWithError.xhtml');
  await editor.open();

  await editor.goToLineColumn(13, 36);
  await wsPage.page.keyboard.press('Control+.');
  const codeActions = wsPage.page.locator('div.context-view.monaco-component').first();
  await expect(codeActions).toBeVisible();
  await screenshotLocator(wsPage.page, codeActions, 'editor-xhtml-code-actions', { margin: 30 });
});
