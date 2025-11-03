import { expect, test } from './fixtures/baseTest';
import { XhtmlEditor } from './page-objects/xhtml-editor';

  test('primeface tag completion', async ({ page }) => {
    const editor = new XhtmlEditor(page);
    await editor.hasNoStatusMessage();
    await editor.openEditorFile();
    await page.getByText('<p:messages').click();
    await page.keyboard.press('Control+Space');
    await expect(editor.complitions).toBeVisible();
    await expect(editor.complitions.getByText('p:media')).toBeVisible();
  });

  test('primeface attr compition', async ({ page }) => {
    const editor = new XhtmlEditor(page);
    await editor.hasNoStatusMessage();
    await editor.openEditorFile();
    await page.getByText('<p:messages />').click();
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowLeft+ArrowLeft');
    await page.keyboard.press('Control+Space');
    await expect(editor.complitions).toBeVisible();
    await expect(editor.complitions.getByText('rendered')).toBeVisible();
    await page.keyboard.press('ArrowDown'); //go to 2nd attribute closable
    await page.keyboard.press('Control+Space');
    await expect(page.getByText('Adds a close icon to hide the messages')).toBeVisible();
  });

  test('htmlBasic tag completion', async ({ page }) => {
    const editor = new XhtmlEditor(page);
    await editor.hasNoStatusMessage();
    await editor.openEditorFile();
    await page.getByText('<h:form').click();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight+ArrowRight');
    await page.keyboard.press('Control+Space');
    await expect(editor.complitions).toBeVisible();
    await expect(editor.complitions.getByText('h:body')).toBeVisible();
  });




