import { expect, test } from './fixtures/baseTest';
import { Editor } from './page-objects/editor';
import { ProcessEditor } from './page-objects/process-editor';

test('Compile java and invalidate class loader', async ({ page }) => {
  const processEditor = new ProcessEditor(page, 'CallJavaMethod.p.json');
  await processEditor.hasDeployProjectStatusMessage();
  await processEditor.openEditorFile();
  const script = processEditor.locatorForPID('19BE060A6564078E-f3');
  await processEditor.hasError(script);
  await processEditor.closeAllTabs();

  await page.locator('div.statusbar-item:has-text("Java: Lightweight Mode")').click();
  await expect(page.locator('div.statusbar-item:has-text("Java: Ready")')).toBeVisible();

  const javaEditor = new Editor('TestClass.java', page);
  await javaEditor.openEditorFile();
  await expect(javaEditor.editorContent()).toContainText('public class TestClass');
  const runMethod = 'public static void run(){}';

  await javaEditor.goToLineColumn(5, 1);
  await javaEditor.typeText(runMethod);
  await expect(javaEditor.editorContent()).toContainText(runMethod);
  await javaEditor.saveAllFiles();
  await javaEditor.hasStatusMessage('Finished: Invalidate class loader');

  await processEditor.openEditorFile();
  const start = processEditor.locatorForPID('19BE060A6564078E-f0');
  const end = processEditor.locatorForPID('19BE060A6564078E-f1');
  await processEditor.startProcessAndAssertExecuted(start, end);
});
