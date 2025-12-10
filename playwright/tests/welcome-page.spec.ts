import { expect, test } from './fixtures/baseTest';
import { WelcomePage } from './page-objects/welcome-page';

test('toggle show welcome page', async ({ page }) => {
  const welcomePage = new WelcomePage(page);

  await welcomePage.executeCommand('Developer: Reload Window');
  await welcomePage.isViewVisible();
  await expect(welcomePage.showWelcomePage).toBeChecked();

  await welcomePage.showWelcomePage.uncheck();
  await welcomePage.executeCommand('Developer: Reload Window');
  await welcomePage.hasDeployProjectStatusMessage();
  await expect(welcomePage.viewLocator).toBeHidden();

  await welcomePage.executeCommand('Axon Ivy: Open Welcome Page');
  await expect(welcomePage.showWelcomePage).not.toBeChecked();

  await welcomePage.showWelcomePage.check();
  await welcomePage.executeCommand('Developer: Reload Window');
  await welcomePage.isViewVisible();
  await expect(welcomePage.showWelcomePage).toBeChecked();
});
