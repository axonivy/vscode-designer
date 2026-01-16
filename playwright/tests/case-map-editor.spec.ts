import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { CaseMapEditor } from './page-objects/case-map-editor';

test('Read, write', async ({ page }) => {
  const editor = new CaseMapEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isTabVisible();
  await editor.isViewVisible();

  expect(editor.stages.count()).toBe(1);
  await editor.stages.first().click();
  await editor.detail.getByRole('textbox', { name: 'Name' }).fill('my new name');
  await editor.isDirty();
  await editor.saveAllFiles();
  await editor.isNotDirty();
  await editor.executeCommand('View: Reopen Editor With Text Editor');
  await expect(editor.editorContent()).toContainText('name: my new name');
});
