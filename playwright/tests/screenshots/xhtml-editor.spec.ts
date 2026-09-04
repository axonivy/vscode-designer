import { expect, test } from '~/fixtures/baseTest';
import { XhtmlEditor } from '~/page-objects/xhtml-editor';
import { screenshotProject } from '~/workspaces/workspace';
import { screenshot, screenshotLocator } from './screenshot-util';

test.use({ workspace: screenshotProject });

test.beforeEach(({ electronApp }) => {
  test.skip(!electronApp, 'Electron app is required for this test');
});

test('xhtml editor preview', async ({ wsPage, electronApp }) => {
  test.skip(!electronApp, 'Electron app is required for this test');
  if (!electronApp) {
    return;
  }
  const editor = new XhtmlEditor(wsPage, 'DemoDialog.xhtml');
  await editor.open();
  const timeout = { timeout: 10_000 };

  await expect(async () => {
    await wsPage.hasReadyStatusMessage();
    await wsPage.executeCommand('Axon Ivy: Deploy All Projects');
    await wsPage.hasStatusMessage('Axon Ivy: Success: Deploying projects');
    const [browserPage] = await Promise.all([electronApp.waitForEvent('window'), wsPage.page.getByRole('button', { name: 'Open Dialog Preview' }).click()]);
    await expect(browserPage.locator('#iFrameForm\\:frameTaskName')).toHaveText('Preview', timeout);
    await expect(browserPage.frameLocator('iframe').getByRole('textbox')).toBeVisible(timeout);
    await expect(browserPage.locator('#iFrameForm\\:previewElementPicker')).toBeVisible(timeout);
  }).toPass();

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
  await screenshotLocator(wsPage.page, hover, 'editor-xhtml-hover', 30);
});

test('completions', async ({ wsPage }) => {
  const editor = new XhtmlEditor(wsPage, 'DialogWithError.xhtml');
  await editor.open();

  await editor.goToLineColumn(13, 36);
  await wsPage.page.keyboard.press('Control+Space');
  await expect(editor.completions).toBeVisible();
  await screenshotLocator(wsPage.page, editor.completions, 'editor-xhtml-completions', 30);
});

test('code actions', async ({ wsPage }) => {
  const editor = new XhtmlEditor(wsPage, 'DialogWithError.xhtml');
  await editor.open();

  await editor.goToLineColumn(13, 36);
  await wsPage.page.keyboard.press('Control+.');
  const codeActions = wsPage.page.locator('div.context-view.monaco-component').first();
  await expect(codeActions).toBeVisible();
  await screenshotLocator(wsPage.page, codeActions, 'editor-xhtml-code-actions', 30);
});
