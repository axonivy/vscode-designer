import { expect } from 'playwright/test';
import { BrowserView } from './page-objects/browser-view';
import { test } from './fixtures/baseTest';
import { DataClassEditor } from './page-objects/data-class-editor';
import { Editor } from './page-objects/editor';

test.describe('Data Class Editor', () => {
  test('Open help and add attribute', async ({ page }) => {
    const editor = new DataClassEditor(page);
    await editor.hasDeployProjectStatusMessage();
    await editor.openEditorFile();
    await editor.isViewVisible();

    await editor.viewFrameLoactor().getByRole('button', { name: /Help/ }).click();
    const browserView = new BrowserView(page);
    expect((await browserView.input().inputValue()).toString()).toMatch(/^https:\/\/developer\.axonivy\.com.*data-classes\/data-classes.html#data-class-editor$/);

    await editor
      .viewFrameLoactor()
      .getByRole('button', { name: /Add Attribute/ })
      .click();
    const attributeName = 'testAttributeName';
    const dialog = editor.viewFrameLoactor().getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Name' }).fill(attributeName);
    await dialog.getByRole('button', { name: 'Create Attribute' }).click();

    await editor.isDirty();
    await editor.saveAllFiles();
    await editor.isNotDirty();

    await expect(editor.viewFrameLoactor().locator('table')).toContainText(attributeName);
    const javaEditor = new Editor('DataClassEditorTest.java', page);
    await javaEditor.openEditorFile();
    await javaEditor.isTabVisible();
    await javaEditor.activeEditorHasText(`  private java.lang.String ${attributeName};`);
  });
});
