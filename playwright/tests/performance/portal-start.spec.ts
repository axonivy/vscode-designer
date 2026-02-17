import { expect, test } from '../fixtures/baseTest';
import { ProcessEditor } from '../page-objects/process-editor';
import { portalPerformanceWorkspacePath } from '../workspaces/workspace';

test.describe('Portal performance', () => {
  test.use({ workspace: portalPerformanceWorkspacePath });

  test('Portal home', async ({ page }) => {
    await expect(page.locator('#status\\.problems')).not.toHaveAttribute('aria-label', 'No Problems');
    await expect(page.locator('div.statusbar-item:has-text("Java: Ready")')).toBeVisible();
    const processEditor = new ProcessEditor(page, 'PortalStart.p.json');
    await processEditor.openEditorFile();
    const start = processEditor.locatorForPID('1549F58C18A6C562-f28').locator('circle');
    await processEditor.startProcessAndAssertExecuted(start, start);
    await page.waitForTimeout(10_000);
  });
});
