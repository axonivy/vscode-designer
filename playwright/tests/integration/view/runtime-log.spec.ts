import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { ProcessEditor } from '~/page-objects/process-editor';

test('Runtime Log view output channel', { tag: '@serial' }, async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage, 'RuntimeLog.p.json');
  await editor.open();

  const start = editor.elementByPID('197F9A7B42E24AE0-f0');
  await expect(start).toBeVisible();

  const endOfTask = editor.elementByPID('197F9A7B42E24AE0-f3');
  await editor.startProcessAndAssertExecuted(start, endOfTask);

  await wsPage.executeCommand('Axon Ivy: Open Axon Ivy Runtime Log');

  const runtimeLogOutput = wsPage.page.getByRole('document', { name: 'Runtime Log - Output' }).getByRole('code');

  await runtimeLogOutput.click();
  await runtimeLogOutput.press('ControlOrMeta+Home');

  await expect(runtimeLogOutput).toContainText('[info]');
  await expect(runtimeLogOutput).toContainText('Process Called');
  await expect(runtimeLogOutput).toContainText('[error]');
  await expect(runtimeLogOutput).toContainText('Process failed');
  await expect(runtimeLogOutput).toContainText('java.lang.RuntimeException');
});
