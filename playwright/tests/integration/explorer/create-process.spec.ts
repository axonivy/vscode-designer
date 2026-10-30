import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { ProcessEditor } from '~/page-objects/process-editor';

const processName = 'testCreateProcess';

test('Add business process, execute, edit and redeploy', { tag: '@serial' }, async ({ wsPage }) => {
  await wsPage.activateExpensiveJavaStandardMode();
  const explorer = new FileExplorer(wsPage);
  await wsPage.hasReadyStatusMessage();
  await explorer.addProcess(processName, 'Business Process');
  await explorer.hasNodeExact(`${processName}.p.json`);
  const processEditor = new ProcessEditor(wsPage, `${processName}.p.json`);
  const start = processEditor.elementByType('start:requestStart');
  const end = processEditor.elementByType('end:taskEnd');
  await wsPage.hasStatusMessage('Axon Ivy: Success - Invalidating class loader');
  await wsPage.hasReadyStatusMessage();
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
  await explorer.hasNodeExact('parent1');
  await explorer.hasNodeExact('parent2');
  await explorer.hasNodeExact(`${processName}.p.json`);
  const processEditor = new ProcessEditor(wsPage, `${processName}.p.json`);
  const start = processEditor.elementByType('start:requestStart');
  await expect(start).toBeVisible();
});

test('Add callable sub process', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addProcess(processName, 'Callable Sub Process');
  await explorer.hasNodeExact(`${processName}.p.json`);
  const processEditor = new ProcessEditor(wsPage, `${processName}.p.json`);
  const start = processEditor.elementByType('start:callSubStart');
  await expect(start).toBeVisible();
});

test('Add web service process', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addProcess(processName, 'Web Service Process');
  await explorer.hasNodeExact(`${processName}.p.json`);
  const processEditor = new ProcessEditor(wsPage, `${processName}.p.json`);
  const start = processEditor.elementByType('start:webserviceStart');
  await expect(start).toBeVisible();
});

test('Process validation', async ({ wsPage }) => {
  // Validate Java Keywords Validation from Backend
  const explorer = new FileExplorer(wsPage);
  await explorer.addProcess('default', 'Business Process');
  await expect(wsPage.toasts.first()).toContainText("Error validating Artifact Name: The input 'default' is not allowed (Java keywords are not allowed)");

  // Validate duplicate empty namespace
  await explorer.addProcess('Actions', 'Business Process', '');
  await expect(wsPage.quickInputMessage).toBeVisible();
  await expect(wsPage.quickInputMessage).toHaveText('A process with this name and namespace already exists in this project.');

  // Validate duplicate nested namespace
  await explorer.addProcess(processName, 'Business Process', 'parent1/parent2');
  await explorer.addProcess(processName, 'Business Process', 'parent1/parent2');
  await expect(wsPage.quickInputMessage).toBeVisible();
  await expect(wsPage.quickInputMessage).toHaveText('A process with this name and namespace already exists in this project.');
});
