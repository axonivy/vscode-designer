import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { DataClassEditor } from '../page-objects/data-class-editor';
import { Editor } from '../page-objects/editor';
import { OutputView } from '../page-objects/output-view';

test.describe('Data Class Editor', () => {
  test('Add attribute', async ({ page }) => {
    const editor = new DataClassEditor(page);
    await editor.hasDeployProjectStatusMessage();
    await editor.openEditorFile();
    await editor.isViewVisible();

    await editor
      .viewFrameLocator()
      .getByRole('button', { name: /Add Attribute/ })
      .click();
    const attributeName = 'testAttributeName';
    const dialog = editor.viewFrameLocator().getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Name' }).fill(attributeName);
    await dialog.getByRole('button', { name: 'Create Attribute' }).click();

    await editor.isDirty();
    await editor.saveAllFiles();
    await editor.isNotDirty();

    await expect(editor.viewFrameLocator().locator('table')).toContainText(attributeName);
    const javaEditor = new Editor('DataClassEditorTest.java', page);
    await javaEditor.openEditorFile();
    await javaEditor.isTabVisible();
    await expect(javaEditor.editorContent()).toContainText(`  private java.lang.String ${attributeName};`);
  });

  test('Type completion with JDT language server', async ({ page }) => {
    test.setTimeout(60_000); // slow test due to java activation
    const editor = new DataClassEditor(page);
    await editor.hasDeployProjectStatusMessage();
    await editor.openEditorFile();
    await editor.isViewVisible();

    await editor.activateExpensiveJavaStandardMode();

    await editor
      .viewFrameLocator()
      .getByRole('button', { name: /Add Attribute/ })
      .click();
    const dialog = editor.viewFrameLocator().getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Name' }).fill('testTask');
    await dialog.getByRole('button', { name: 'Browser' }).click();
    await dialog.getByRole('checkbox', { name: 'Search over all types' }).check();
    await dialog.getByRole('textbox').fill('ITask');
    await dialog.getByRole('table').getByRole('row', { name: 'ITask ch.ivyteam.ivy.workflow' }).click();
    await dialog.getByRole('button', { name: 'Apply' }).click();
    await expect(dialog.getByRole('textbox', { name: 'Type' })).toHaveValue('ch.ivyteam.ivy.workflow.ITask');
    await dialog.getByRole('button', { name: 'Create Attribute' }).click();

    await editor.isDirty();
    await editor.saveAllFiles();
    await editor.isNotDirty();
  });

  test('Open help', async ({ page }) => {
    const editor = new DataClassEditor(page);
    const outputView = new OutputView(page);
    await editor.openEditorFile();
    await outputView.openLog('Axon Ivy Extension');

    await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
    await page.keyboard.press('Escape');
    await outputView.expectLogEntry('Opening URL externally');
    await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*data-classes\/data-classes.html#data-class-editor/);
  });
});
