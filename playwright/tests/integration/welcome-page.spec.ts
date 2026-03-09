import { expect, test } from '../fixtures/baseTest';
import { WelcomePage } from '../page-objects/welcome-page';

test.describe('Welcome Page', () => {
  test.use({ closeAllTabsOnInit: false });

  test('toggle show welcome page', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    await welcomePage.hasDeployProjectStatusMessage();
    await welcomePage.isViewVisible();
    await expect(welcomePage.showPageCheckbox).toBeChecked();

    await welcomePage.showPageCheckbox.uncheck();
    await expect(welcomePage.showPageCheckbox).not.toBeChecked();
    await welcomePage.closeAllTabs();
    await welcomePage.executeCommand('Axon Ivy: Open Welcome Page');
    await expect(welcomePage.showPageCheckbox).not.toBeChecked();

    await welcomePage.showPageCheckbox.check();
    await expect(welcomePage.showPageCheckbox).toBeChecked();
    await welcomePage.closeAllTabs();
    await welcomePage.executeCommand('Axon Ivy: Open Welcome Page');
    await expect(welcomePage.showPageCheckbox).toBeChecked();
  });
});
