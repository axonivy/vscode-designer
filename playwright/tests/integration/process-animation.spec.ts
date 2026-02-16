import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { FileExplorer } from '../page-objects/explorer-view';
import { ProcessEditor } from '../page-objects/process-editor';

test.describe('Process Animation', () => {
  test.beforeEach(async ({ page }) => {
    await new FileExplorer(page).hasDeployProjectStatusMessage();
  });

  test('with activated animation and reset afterwards', async ({ page }) => {
    const processEditor = new ProcessEditor(page, 'Animation.p.json');
    await processEditor.openEditorFile();
    const start = processEditor.locatorForPID('190EEC366DECC66A-f0');
    await expect(start).toBeVisible();

    await processEditor.executeCommand('Axon Ivy: Activate Process Animation');
    await processEditor.page.waitForTimeout(2_000); // ensure config is respected
    const taskInCallSub = processEditor.locatorForPID('190EEC3ABECE2C88-f5');
    await processEditor.startProcessAndAssertExecuted(start, taskInCallSub);
    await processEditor.page.waitForTimeout(500); //ensure animation finished
    await processEditor.executeCommand('Axon Ivy: Stop BPM Engine of Project');
    await processEditor.assertNotExecuted(taskInCallSub);
  });

  test('with deactivated animation', async ({ page }) => {
    const processEditor = new ProcessEditor(page, 'NoAnimation.p.json');
    await processEditor.openEditorFile();
    const start = processEditor.locatorForPID('191A2645F90CDC61-f0');
    await expect(start).toBeVisible();

    await processEditor.executeCommand('Axon Ivy: Deactivate Process Animation');
    await processEditor.page.waitForTimeout(2_000); // ensure config is respected
    const callSub = processEditor.locatorForPID('191A2645F90CDC61-f3');
    await processEditor.startProcessAndAssertExecuted(start, callSub);
    await processEditor.page.waitForTimeout(1_000); // to ensure no jump
    await expect(callSub).toBeVisible();
  });
});
