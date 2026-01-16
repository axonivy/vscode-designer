import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { CaseMapEditor } from './page-objects/case-map-editor';

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
});
