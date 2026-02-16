import { expect, test } from './fixtures/baseTest';
import { WelcomePage } from './page-objects/welcome-page';

test.describe('Welcome Page', () => {
  test.use({ closeAllTabsOnInit: false });

  test('toggle show welcome page', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    await welcomePage.hasDeployProjectStatusMessage();
    await welcomePage.isViewVisible();
    await expect(welcomePage.showWelcomePage).toBeChecked();

    await welcomePage.showWelcomePage.uncheck();
    await expect(welcomePage.showWelcomePage).not.toBeChecked();
    await welcomePage.closeAllTabs();
    await welcomePage.executeCommand('Axon Ivy: Open Welcome Page');
    await expect(welcomePage.showWelcomePage).not.toBeChecked();

    await welcomePage.showWelcomePage.check();
    await expect(welcomePage.showWelcomePage).toBeChecked();
    await welcomePage.closeAllTabs();
    await welcomePage.executeCommand('Axon Ivy: Open Welcome Page');
    await expect(welcomePage.showWelcomePage).toBeChecked();
  });
});
