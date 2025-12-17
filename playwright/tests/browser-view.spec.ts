import { expect, test } from './fixtures/baseTest';
import { BrowserView } from './page-objects/browser-view';

test.describe('Browser View', () => {
  let browserView: BrowserView;

  test('Toolbar and navigation', async ({ page }) => {
    browserView = new BrowserView(page);
    await browserView.hasDeployProjectStatusMessage();

    const home = /home.xhtml/;
    const starts = /starts.xhtml/;
    await browserView.openDevWfUi();
    await assertToolbarInput(/dev-workflow-ui/);

    await browserView.home().click();
    await assertToolbarInput(home);

    const startLink = browserView.content().locator('#menuform\\:sr_starts');
    await expect(startLink).toBeVisible();
    await browserView.content().locator('#menuform\\:sr_starts').click();
    await assertToolbarInput(starts);

    await browserView.reload().click();
    await assertToolbarInput(/vscodeBrowserReqId/);
    await assertToolbarInput(starts);

    await browserView.back().click();
    await assertToolbarInput(starts);

    await browserView.back().click();
    await assertToolbarInput(home);

    await browserView.forward().click();
    await assertToolbarInput(starts);
  });

  async function assertToolbarInput(value: RegExp) {
    await expect(browserView.input()).toHaveValue(value);
  }
});
