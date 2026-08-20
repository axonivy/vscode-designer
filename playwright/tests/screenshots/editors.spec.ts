import { expect, test } from '~/fixtures/baseTest';
import { screenshotProject } from '~/workspaces/workspace';
import { FormEditor } from '../page-objects/form-editor';
import { screenshot } from './screenshot-util';

test.use({ workspace: screenshotProject });

test('form editor preview', async ({ wsPage, electronApp }) => {
  test.skip(!electronApp, 'Electron app is required for this test');
  if (!electronApp) {
    return;
  }
  const editor = new FormEditor(wsPage);
  await editor.open();

  await expect(editor.main.locator('.selected')).toHaveCount(0);
  const timeout = { timeout: 3_000 };
  await expect(async () => {
    await wsPage.executeCommand('Axon Ivy: Deploy All Projects');
    await wsPage.hasStatusMessage('Axon Ivy: Success: Deploying projects');
    const [browserPage] = await Promise.all([electronApp.waitForEvent('window'), editor.toolbar.getByRole('button', { name: 'Open Dialog Preview' }).click()]);
    await expect(browserPage.locator('#iFrameForm\\:frameTaskName')).toHaveText('Preview', timeout);
    await expect(browserPage.frameLocator('iframe').getByRole('textbox')).toBeVisible(timeout);
  }).toPass();

  await new Promise(resolve => setTimeout(resolve, 1000)); // wait for the preview to be fully rendered
  await screenshot(wsPage.page, 'editor-form-preview');
});
