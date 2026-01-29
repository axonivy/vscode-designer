import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { CaseMapEditor } from './page-objects/case-map-editor';
import { OutputView } from './page-objects/output-view';

test.describe('Case Map Editor', () => {
  test('Read, write', async ({ page }) => {
    const editor = new CaseMapEditor(page);
    await editor.hasDeployProjectStatusMessage();
    await editor.openEditorFile();
    await editor.isTabVisible();
    await editor.isViewVisible();

    await expect(editor.stages).toHaveCount(1);
    await editor.stages.first().dblclick({ position: { x: 10, y: 10 } });
    await editor.detail.getByRole('textbox', { name: 'Name' }).fill('my new name');
    await editor.isDirty();
    await editor.saveAllFiles();
    await editor.isNotDirty();

    await editor.executeCommand('View: Reopen Editor With Text Editor');
    await expect(editor.editorContent()).toContainText('"name" : "my new name"');
  });

  test('Open help', async ({ page }) => {
    const editor = new CaseMapEditor(page);
    await editor.openEditorFile();
    const outputView = new OutputView(page);
    await outputView.openLog('Axon Ivy Extension');
    await editor.stages.first().dblclick({ position: { x: 10, y: 10 } });
    await editor.helpButton.click();
    await page.keyboard.press('Escape');
    await outputView.expectLogEntry('Opening URL externally');
    await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*process-modeling\/casemap\.html/);
  });
});
