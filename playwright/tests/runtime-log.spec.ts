import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { ProcessEditor } from './page-objects/process-editor';

test.describe('Runtime Log', () => {
  test('Runtime Log view output channel', async ({ page }) => {
    const processEditor = new ProcessEditor(page, 'RuntimeLog.p.json');
    await processEditor.hasDeployProjectStatusMessage();
    await processEditor.executeCommand('View: Focus into Panel');

    await processEditor.openEditorFile();
    const start = processEditor.locatorForPID('197F45CCD461274C-f0');
    await expect(start).toBeVisible();

    const endOfTask = processEditor.locatorForPID('197F45CCD461274C-f3');
    await processEditor.startProcessAndAssertExecuted(start, endOfTask);

    const runtimeLogOutput = page.getByRole('document', { name: 'Runtime Log - Output' }).getByRole('code');

    await expect(runtimeLogOutput).toContainText('Process Called');
    await expect(runtimeLogOutput).toContainText('Process failed');
  });
});
