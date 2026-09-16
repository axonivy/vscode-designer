import { expect, test } from '~/fixtures/baseTest';
import { VsCodeBrowser } from '~/page-objects/vscode-browser';

test('Deploy and open portal', async ({ wsPage, electronApp }) => {
  const vscodeBrowser = await VsCodeBrowser.openBrowser(() => wsPage.executeCommand('Axon Ivy: Open Portal'), { electronApp });
  await wsPage.statusMessageContains('Axon Ivy: Success: Deploying portal');
  await expect(vscodeBrowser.browserPage.locator('span.default-welcome-image')).toBeVisible();
});
