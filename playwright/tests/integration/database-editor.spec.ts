import { expect, test } from '../fixtures/baseTest';
import { DatabaseEditor } from '../page-objects/database-editor';
import { OutputView } from '../page-objects/output-view';

test('Read, write', async ({ page }) => {
  const editor = new DatabaseEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isTabVisible();
  await editor.isViewVisible();

  await expect(editor.rows.first()).toContainText('demo_dblocalhost:3306mySQL');
  await editor.rows.first().click();
  await editor.detail.getByRole('textbox', { name: 'Host' }).fill('127.0.0.1');
  await editor.isDirty();
  await editor.saveAllFiles();
  await editor.isNotDirty();
  await editor.executeCommand('View: Reopen Editor With Text Editor');
  await expect(editor.editorContent()).toContainText('Url: jdbc:mysql://127.0.0.1:3306/demo');
});

test('Open help', async ({ page }) => {
  const outputView = new OutputView(page);
  const editor = new DatabaseEditor(page);
  await editor.executeCommand('Axon Ivy: Open Database Editor');
  await outputView.openLog('Axon Ivy Extension');

  await editor.viewFrameLocator().getByRole('button', { name: /Help/ }).click();
  await page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com\/.*\/databases\.html#database-editor/);
});
