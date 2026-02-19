import { expect, test } from '../fixtures/baseTest';
import { BrowserView } from '../page-objects/browser-view';
import { ProcessEditor } from '../page-objects/process-editor';
import { portalPerformanceWorkspacePath } from '../workspaces/workspace';

test.describe('Portal performance', () => {
  test.use({ workspace: portalPerformanceWorkspacePath });

  test('Portal home', async ({ page }) => {
    await expect(async () => {
      const javaReady = async () => await expect(page.locator('div.statusbar-item:has-text("Java: Ready")')).toBeVisible({ timeout: 200 });
      for (let i = 0; i < 10; i++) {
        await javaReady();
        await page.waitForTimeout(500);
      }
    }).toPass();
    const processEditor = new ProcessEditor(page, 'PortalStart.p.json');
    await processEditor.hasStatusMessage('Finished: Invalidate class loader');
    await processEditor.executeCommand('View: Hide Panel');
    await processEditor.openEditorFile();
    const start = processEditor.locatorForPID('1549F58C18A6C562-f28');
    await processEditor.startProcessAndAssertExecuted(start, start);
    const browser = new BrowserView(page);
    await expect(browser.content().locator('span.default-welcome-image')).toBeVisible();
  });
});
