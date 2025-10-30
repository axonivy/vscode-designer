import { expect, test } from './fixtures/baseTest';
import { XhtmlEditor } from './page-objects/xhtml-editor';

  test('primeface_tag_completion', async ({ page }) => {
    const editor = new XhtmlEditor(page);
    const completionDialogSelector = '.suggest-widget';
    await editor.openEditorFile();
    await editor.hasNoStatusMessage();
    await page.getByText('<p:messages').click();
    await page.keyboard.press('Control+Space');
    const completionDialog = page.locator(completionDialogSelector);
    await expect(completionDialog).toBeVisible();
    await expect(completionDialog.getByText('p:media')).toBeVisible();
  });

  test('primeface_attr_compition', async ({ page }) => {
    const editor = new XhtmlEditor(page);
    const completionDialogSelector = '.suggest-widget';
    await editor.openEditorFile();
    await editor.hasNoStatusMessage();
    await page.getByText('<p:messages />').click();
    await page.keyboard.press('ArrowRight+ArrowRight+ArrowRight+ArrowRight');
    await page.keyboard.press('ArrowRight+ArrowRight+ArrowRight+ArrowRight');
    await page.keyboard.press('Control+Space');
    const completionDialog = page.locator(completionDialogSelector);
    await expect(completionDialog).toBeVisible();
    await expect(completionDialog.getByText('rendered')).toBeVisible();
    await page.keyboard.press('ArrowDown'); //go to 2nd attribute closable
    await expect(page.getByText('Adds a close icon to hide the messages')).toBeVisible();
  });

  test('htmlBasic_tag_completion', async ({ page }) => {
    const editor = new XhtmlEditor(page);
    const completionDialogSelector = '.suggest-widget';
    await editor.openEditorFile();
    await editor.hasNoStatusMessage();
    await page.getByText('<h:form').click();
    const completionDialog = page.locator(completionDialogSelector);
    await page.keyboard.press('ArrowLeft+ArrowLeft+ArrowLeft+ArrowLeft');
    await page.keyboard.press('Control+Space');
    await expect(completionDialog).toBeVisible();
    await expect(completionDialog.getByText('h:body')).toBeVisible();
  });
