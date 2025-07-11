import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { ProcessEditor } from './page-objects/process-editor';

test.describe('Runtime Log', () => {
  test('Runtime Log view output channel', async ({ page }) => {
    const processEditor = new ProcessEditor(page, 'RuntimeLog.p.json');
    await processEditor.hasDeployProjectStatusMessage();
    await processEditor.openEditorFile();
    await processEditor.isViewVisible();

    const start = processEditor.locatorForPID('197F9A7B42E24AE0-f0');
    await expect(start).toBeVisible();

    const endOfTask = processEditor.locatorForPID('197F9A7B42E24AE0-f3');
    await processEditor.startProcessAndAssertExecuted(start, endOfTask);

    await processEditor.executeCommand('Axon Ivy: Open Axon Ivy Runtime Log');

    const runtimeLogOutput = page.getByRole('document', { name: 'Runtime Log - Output' }).getByRole('code');

    await expect(runtimeLogOutput).toContainText('Process Called');
    await expect(runtimeLogOutput).toContainText('Process failed');
  });
});
