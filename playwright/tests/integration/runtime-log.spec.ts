import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { ProcessEditor } from '../page-objects/process-editor';

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

    await page.getByRole('button', { name: 'Maximize Panel' }).click();

    await page.evaluate((linkText) => {
      const links = Array.from(document.querySelectorAll('a'));
      const target = links.find(link =>
        link.textContent?.trim() === linkText
      );
      if (target) {
        // Scroll the link into view
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });

        // Scroll any parent scrollable containers
        let parent = target.parentElement;
        while (parent) {
          if (parent.scrollHeight > parent.clientHeight) {
            parent.scrollTop += 100; // scroll down a bit
          }
          parent = parent.parentElement;
        }
      }
    }, "Open Activities");

    monaco-scrollable-element editor-scrollable

    const runtimeLogOutput = page.getByRole('document', { name: 'Runtime Log - Output' }).getByRole('code');

    await runtimeLogOutput.click();
    await runtimeLogOutput.press('ControlOrMeta+Home');

    await expect(runtimeLogOutput).toContainText('[info]');
    await expect(runtimeLogOutput).toContainText('Process Called');
    await expect(runtimeLogOutput).toContainText('[error]');
    await expect(runtimeLogOutput).toContainText('Process failed');
    await expect(runtimeLogOutput).toContainText('java.lang.RuntimeException');
  });
});
