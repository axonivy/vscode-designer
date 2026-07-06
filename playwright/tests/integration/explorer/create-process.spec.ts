import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { ProcessEditor } from '~/page-objects/process-editor';

const processName = 'testCreateProcess';

test('Add business process, execute, edit and redeploy', { tag: '@serial' }, async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addProcess(processName, 'Business Process');
  await explorer.hasNode(`${processName}.p.json`);
  const processEditor = new ProcessEditor(wsPage, `${processName}.p.json`);
  const start = processEditor.elementByType('start:requestStart');
  const end = processEditor.elementByType('end:taskEnd');
  await processEditor.startProcessAndAssertExecuted(start, end);

  await processEditor.appendActivity(start, 'Script');
  await processEditor.expectTabDirty();
  await processEditor.save();
  const script = processEditor.elementByType('script');
  await expect(script).toHaveClass(/selected/);
  await expect(start).not.toHaveClass(/executed/);
  await processEditor.startProcessAndAssertExecuted(start, script);
});

test('Add nested business process', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addProcess(processName, 'Business Process', 'parent1/parent2');
  await explorer.hasNode('parent1');
  await explorer.hasNode('parent2');
  await explorer.hasNode(`${processName}.p.json`);
  const processEditor = new ProcessEditor(wsPage, `${processName}.p.json`);
  const start = processEditor.elementByType('start:requestStart');
  await expect(start).toBeVisible();
});

test('Add callable sub process', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addProcess(processName, 'Callable Sub Process');
  await explorer.hasNode(`${processName}.p.json`);
  const processEditor = new ProcessEditor(wsPage, `${processName}.p.json`);
  const start = processEditor.elementByType('start:callSubStart');
  await expect(start).toBeVisible();
});

test('Add web service process', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addProcess(processName, 'Web Service Process');
  await explorer.hasNode(`${processName}.p.json`);
  const processEditor = new ProcessEditor(wsPage, `${processName}.p.json`);
  const start = processEditor.elementByType('start:webserviceStart');
  await expect(start).toBeVisible();
});

test('Process name validation', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addProcess('default', 'Business Process');
  await expect(wsPage.toasts.first()).toContainText("Error validating Artifact Name: The input 'default' is not allowed (Java keywords are not allowed)");
});
