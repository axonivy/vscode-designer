import { test } from '../fixtures/baseTest';
import { XhtmlEditor } from '../page-objects/xhtml-editor';

test('xhtml completions', async ({ page }) => {
  const editor = new XhtmlEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.expectCompletionAtLineColumn('p:media', 20, 16);
  await editor.expectCompletionAtLineColumn('rendered', 20, 23);
  await editor.expectCompletionAtLineColumn('h:body', 19, 10);
});

test('xhtml definitions', async ({ page }) => {
  const editor = new XhtmlEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.activateExpensiveJavaStandardMode();
  await editor.expectDefinitionAtLineColumn('WorkflowBean.java', 24, 64);
  await editor.expectDefinitionAtLineColumn('IvyJsf.java', 24, 111);
  await editor.expectDefinitionAtLineColumn('IvyJsf.java', 24, 115);
  await editor.expectDefinitionAtLineColumn('ContentManagement.java', 24, 118);
});
