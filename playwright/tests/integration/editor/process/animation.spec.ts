import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { ProcessEditor } from '~/page-objects/process-editor';

test('with activated animation and reset afterwards', { tag: '@serial' }, async ({ wsPage }) => {
  const processEditor = new ProcessEditor(wsPage, 'Animation.p.json');
  const callableEditor = new ProcessEditor(wsPage, 'Callable.p.json', 2);
  await processEditor.open();
  const start = processEditor.elementByPID('190EEC366DECC66A-f0');
  await expect(start).toBeVisible();

  await wsPage.executeCommand('Axon Ivy: Activate Process Animation');
  await wsPage.page.waitForTimeout(2_000); // ensure config is respected
  const taskInCallSub = callableEditor.elementByPID('190EEC3ABECE2C88-f5');
  await processEditor.startProcessAndAssertExecuted(start, taskInCallSub);
  await wsPage.page.waitForTimeout(500); //ensure animation finished
  await wsPage.executeCommand('Axon Ivy: Stop BPM Engine of Project');
  await processEditor.assertNotExecuted(taskInCallSub);
});

test('with deactivated animation', { tag: '@serial' }, async ({ wsPage }) => {
  const processEditor = new ProcessEditor(wsPage, 'NoAnimation.p.json');
  await processEditor.open();
  const start = processEditor.elementByPID('191A2645F90CDC61-f0');
  await expect(start).toBeVisible();

  const callSub = processEditor.elementByPID('191A2645F90CDC61-f3');
  await processEditor.startProcessAndAssertExecuted(start, callSub);
  await wsPage.page.waitForTimeout(1_000); // to ensure no jump
  await expect(callSub).toBeVisible();

  const executionBadge = start.locator('.execution');
  await expect(executionBadge).toBeVisible();
  await executionBadge.click();
  await expect(processEditor.webViewFrame.locator('.history-ui-container .ui-popover-content')).toContainText(`History of '191A2645F90CDC61-f0'`);
});
