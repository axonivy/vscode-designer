import { test } from '../fixtures/baseTest';
import { XhtmlEditor } from '../page-objects/xhtml-editor';

test('xhtml completions', async ({ page }) => {
  const editor = new XhtmlEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.expectCompletionAtLineColumn('p:media', 18, 11);
  await editor.expectCompletionAtLineColumn('rendered', 18, 19);
  await editor.expectCompletionAtLineColumn('h:body', 17, 6);
});
