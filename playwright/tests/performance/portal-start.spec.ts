import { expect, test } from '../fixtures/baseTest';
import { BrowserView } from '../page-objects/browser-view';
import { ProcessEditor } from '../page-objects/process-editor';
import { embeddedEngineWorkspace, portalPerformanceWorkspacePath } from '../workspaces/workspace';

test.describe('Ensure engine downloaded', () => {
  test.use({ workspace: embeddedEngineWorkspace });

  test('Dummy test to ensure engine is loaded', async ({ page }) => {
    const processEditor = new ProcessEditor(page, 'PortalStart.p.json');
    await processEditor.hasDeployProjectStatusMessage();
  });
});

test.describe('Portal performance', () => {
  test.use({ workspace: portalPerformanceWorkspacePath });

  test('Portal home', async ({ page }) => {
    await expect(page.locator('#status\\.problems')).not.toHaveAttribute('aria-label', 'No Problems');
    await page.waitForTimeout(1_000);
    const processEditor = new ProcessEditor(page, 'PortalStart.p.json');
    await processEditor.hasStatusMessage('Finished: Invalidate class loader');
    await processEditor.openEditorFile();
    const start = processEditor.locatorForPID('1549F58C18A6C562-f28');
    await processEditor.startProcessAndAssertExecuted(start, start);
    const browser = new BrowserView(page);
    await expect(browser.content().locator('span.default-welcome-image')).toBeVisible();
  });
});
