import { expect, test } from '../fixtures/baseTest';
import { FileExplorer } from '../page-objects/explorer-view';

test.describe('Status Bar', () => {
  test('Click status bar, open quick pick and toggle animation', async ({ page }) => {
    const explorer = new FileExplorer(page);
    await explorer.hasReadyStatusMessage();

    const statusBar = explorer.statusBar();
    await expect(statusBar).toBeVisible();
    await statusBar.click({ delay: 100 });

    const commands = explorer.quickInputList();
    await expect(commands).toBeVisible();

    await explorer.selectItemFromQuickPick('Animation');

    await expect(explorer.quickInputList()).toBeHidden();
  });
});
