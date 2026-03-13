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

test('xhtml definitions', async ({ page }) => {
  const editor = new XhtmlEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.activateExpensiveJavaStandardMode();
  await editor.expectDefinitionAtLineColumn('WorkflowBean.java', 22, 60);
  await editor.expectDefinitionAtLineColumn('IvyJsf.java', 22, 107);
  await editor.expectDefinitionAtLineColumn('IvyJsf.java', 22, 111);
  await editor.expectDefinitionAtLineColumn('ContentManagement.java', 22, 114);
});
