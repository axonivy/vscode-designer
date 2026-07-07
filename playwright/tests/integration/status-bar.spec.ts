import { expect, test } from '../fixtures/baseTest';

test.describe('Status Bar', () => {
  test('Click status bar, open quick pick and toggle animation', async ({ wsPage }) => {
    const ivyStatusBar = wsPage.ivyStatusBar;
    await expect(ivyStatusBar).toBeVisible();
    await ivyStatusBar.click({ delay: 100 });

    const commands = wsPage.quickInputList;
    await expect(commands).toBeVisible();

    await wsPage.selectItemFromQuickPick('Animation');

    await expect(wsPage.quickInputList).toBeHidden();
  });
});
