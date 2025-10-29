import { expect, test } from './fixtures/baseTest';
import { XhtmlEditor } from './page-objects/xhtml-editor';


  test('XHTML Editor completion', async ({ page }) => {
    const editor = new XhtmlEditor(page);
    const completionDialogSelector = '.suggest-widget';
    const firstCompletionItemSelector = '.monaco-list-row .label-name';
    await editor.openEditorFile();
    await editor.hasNoStatusMessage();
    await page.getByText("<p:messages").click();
    await page.keyboard.press("Control+Space");
    const completionDialog = page.locator(completionDialogSelector);
    await expect(completionDialog).toBeVisible({ timeout: 5000 });
    const firstCompletionItem = page.locator(firstCompletionItemSelector).first();
    await expect(firstCompletionItem).toBeVisible();
    const firstItemText = await firstCompletionItem.innerText();
    console.log(firstItemText);
    const expectedText = 'p:media';
    console.log(expectedText);
    await expect(firstCompletionItem).toBeVisible();
  });
