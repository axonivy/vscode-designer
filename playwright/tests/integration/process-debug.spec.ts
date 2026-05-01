import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { FileExplorer } from '../page-objects/explorer-view';
import { PageObject } from '../page-objects/page-object';
import { ProcessEditor } from '../page-objects/process-editor';
import { VsDebugView } from '../page-objects/vs-debug-view';

test.beforeEach(async ({ page }) => {
  await new FileExplorer(page).hasDeployProjectStatusMessage();
  await new PageObject(page).executeCommand('Axon Ivy: Deactivate Process Animation');
});

test('debug', async ({ page }) => {
  const processEditor = new ProcessEditor(page, 'NoAnimation.p.json');
  await processEditor.openEditorFile();
  const start = processEditor.locatorForPID('191A2645F90CDC61-f0');
  await expect(start).toBeVisible();

  const callSub = processEditor.locatorForPID('191A2645F90CDC61-f3');
  await processEditor.addBreakpoint(callSub);

  const debugView = await VsDebugView.showDebugView(page);
  await debugView.assertBreakpoint('NoAnimation.p.json', '28');

  await debugView.startDebugSession();
  await processEditor.page.waitForTimeout(2_000); // ensure session is started

  await processEditor.startProcessAndAssertExecuted(start, callSub);
  await expect(callSub).toBeVisible();
  await processEditor.assertStopped(callSub);

  await expect(debugView.callStackEntry('191A2645F90CDC61-f3', 'NoAnimation')).toBeVisible();
  await expect(debugView.variable('Scope Process Data')).toBeVisible();
  await expect(debugView.variable('ivy')).toBeVisible();
  await expect(debugView.variable('datacache')).toBeHidden();
  await expect(debugView.variable('in, value Data()')).toBeVisible();

  await debugView.variable('ivy').locator('.collapsible').click();
  await expect(debugView.variable('datacache')).toBeVisible();

  await debugView.continueDebugSession();
  await processEditor.assertNotStopped(callSub);
  await expect(debugView.variable('Scope Process Data')).toBeHidden();

  await debugView.stopDebugSession();
});
