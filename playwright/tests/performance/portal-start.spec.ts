import { expect, test } from '../fixtures/baseTest';
import { BrowserView } from '../page-objects/browser-view';
import { ProcessEditor } from '../page-objects/process-editor';
import { portalPerformanceWorkspacePath } from '../workspaces/workspace';

test('Dummy test to ensure vscode setup (java version set)', async ({ page }) => {
  await new ProcessEditor(page).hasDeployProjectStatusMessage();
});

test.describe('Portal performance', () => {
  test.use({ workspace: portalPerformanceWorkspacePath });

  test('Portal home', async ({ page }) => {
    await expect(page.locator('#status\\.problems')).not.toHaveAttribute('aria-label', 'No Problems');
    await expect(page.locator('div.statusbar-item:has-text("Java: Ready")')).toBeVisible();
    const processEditor = new ProcessEditor(page, 'PortalStart.p.json');
    await processEditor.openEditorFile();
    const start = processEditor.locatorForPID('1549F58C18A6C562-f28');
    await processEditor.startProcessAndAssertExecuted(start, start);
    const browser = new BrowserView(page);
    await expect(browser.content().locator('span.default-welcome-image')).toBeVisible();
  });
});
