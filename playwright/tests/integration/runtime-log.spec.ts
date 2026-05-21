import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { Editor } from '../page-objects/editor';
import { ProcessEditor } from '../page-objects/process-editor';

// eslint-disable-next-line
test.describe.only('Runtime Log', () => {
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
    await expect(runtimeLogOutput).toContainText('Done');

    const panel = page.locator('#workbench\\.parts\\.panel');
    const buttonViewMoreActions = panel.getByRole('button', { name: 'Views and More Actions...' });
    await buttonViewMoreActions.click();

    const buttonOpenInEditor = page.locator('span.action-label[aria-label="Open Output in Editor"]');
    await expect(buttonOpenInEditor).toBeVisible();
    await buttonOpenInEditor.click();

    const runtimeLogEditor = new Editor('axonivy.vscode-designer-14.Axon Ivy Runtime Log.log', page);

    await expect(runtimeLogEditor.editorContent()).toContainText('[info]');
    await expect(runtimeLogEditor.editorContent()).toContainText('Process called');
    await expect(runtimeLogEditor.editorContent()).toContainText('[error]');
    await expect(runtimeLogEditor.editorContent()).toContainText('Process failed');
    await expect(runtimeLogEditor.editorContent()).toContainText('java.lang.RuntimeException');
  });
});
