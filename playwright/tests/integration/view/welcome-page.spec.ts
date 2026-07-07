import { expect, test } from '~/fixtures/baseTest';
import { WelcomePage } from '~/page-objects/welcome-page';

test.use({ closeWelcomePage: false });

test('toggle show welcome page', async ({ wsPage }) => {
  const welcomePage = new WelcomePage(wsPage);
  await expect(welcomePage.showPageCheckbox).toBeChecked();

  await welcomePage.showPageCheckbox.uncheck();
  await expect(welcomePage.showPageCheckbox).not.toBeChecked();
  await wsPage.closeAllTabs();
  await welcomePage.open();
  await expect(welcomePage.showPageCheckbox).not.toBeChecked();

  await welcomePage.showPageCheckbox.check();
  await expect(welcomePage.showPageCheckbox).toBeChecked();
  await wsPage.closeAllTabs();
  await welcomePage.open();
  await expect(welcomePage.showPageCheckbox).toBeChecked();
});
