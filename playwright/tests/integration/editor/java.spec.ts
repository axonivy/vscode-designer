import { expect, test } from '~/fixtures/baseTest';
import { TextEditor } from '~/page-objects/editor';
import { ProcessEditor } from '~/page-objects/process-editor';

test('Compile java and invalidate class loader', { tag: '@serial' }, async ({ wsPage }) => {
  test.setTimeout(60_000); // slow test due to java activation
  const processEditor = new ProcessEditor(wsPage, 'CallJavaMethod.p.json');
  await processEditor.open();
  const script = processEditor.elementByPID('19BE060A6564078E-f3');
  await processEditor.hasError(script);
  await wsPage.closeAllTabs();

  await wsPage.activateExpensiveJavaStandardMode();

  const javaEditor = new TextEditor(wsPage, 'TestClass.java');
  await javaEditor.open();
  await expect(javaEditor.content).toContainText('public class TestClass');
  const runMethod = 'public static void run(){}';

  await javaEditor.goToLineColumn(5, 1);
  await wsPage.page.keyboard.type(runMethod);
  await expect(javaEditor.content).toContainText(runMethod);
  await javaEditor.save({ force: true });
  await wsPage.hasReadyStatusMessage();

  await processEditor.open();
  const start = processEditor.elementByPID('19BE060A6564078E-f0');
  const end = processEditor.elementByPID('19BE060A6564078E-f1');
  await wsPage.page.waitForTimeout(4_000);
  await processEditor.startProcessAndAssertExecuted(start, end);
});
