import { expect, test } from '../fixtures/baseTest';
import { BrowserView } from '../page-objects/browser-view';
import { ProcessEditor } from '../page-objects/process-editor';
import { portalPerformanceWorkspacePath } from '../workspaces/workspace';

test.describe('Portal performance', () => {
  test.use({ workspace: portalPerformanceWorkspacePath });

  test('Portal home', async ({ wsPage }) => {
    await expect(async () => {
      const javaReady = async () => await expect(wsPage.page.locator('div.statusbar-item[id*="redhat.java"]').filter({ hasText: 'Java: Ready' })).toBeVisible({ timeout: 200 });
      for (let i = 0; i < 10; i++) {
        await javaReady();
        await wsPage.page.waitForTimeout(800);
      }
    }).toPass();
    const editor = new ProcessEditor(wsPage, 'PortalStart.p.json');
    await wsPage.executeCommand('View: Hide Panel');
    await editor.open();
    const start = editor.elementByPID('1549F58C18A6C562-f28');
    await editor.startProcessAndAssertExecuted(start, start);
    const browser = new BrowserView(wsPage, 1);
    await expect(browser.content.locator('span.default-welcome-image')).toBeVisible();
  });
});
