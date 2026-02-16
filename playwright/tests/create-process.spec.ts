import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { FileExplorer } from './page-objects/explorer-view';
import { ProcessEditor } from './page-objects/process-editor';

test.describe('Create Process', () => {
  let explorer: FileExplorer;
  let processEditor: ProcessEditor;
  const processName = 'testCreateProcess';

  test.beforeEach(async ({ page }) => {
    explorer = new FileExplorer(page);
    await explorer.hasDeployProjectStatusMessage();
    processEditor = new ProcessEditor(page, `${processName}.p.json`);
  });

  test('Add business process, execute, edit and redeploy', async () => {
    await explorer.addProcess(processName, 'Business Process');
    await explorer.hasNode(`${processName}.p.json`);
    const start = processEditor.locatorForElementType('g.start\\:requestStart');
    const end = processEditor.locatorForElementType('g.end\\:taskEnd');
    await processEditor.startProcessAndAssertExecuted(start, end);

    await processEditor.appendActivity(start, 'Script');
    await processEditor.isDirty();
    await processEditor.saveAllFiles();
    const script = processEditor.locatorForElementType('g.script');
    await expect(script).toHaveClass(/selected/);
    await expect(start).not.toHaveClass(/executed/);
    await processEditor.startProcessAndAssertExecuted(start, script);
  });

  test('Add nested business process', async () => {
    await explorer.addProcess(processName, 'Business Process', 'parent1/parent2');
    await explorer.hasNode('parent1');
    await explorer.hasNode('parent2');
    await explorer.hasNode(`${processName}.p.json`);
    const start = processEditor.locatorForElementType('g.start\\:requestStart');
    await expect(start).toBeVisible();
  });

  test('Add callable sub process', async () => {
    await explorer.addProcess(processName, 'Callable Sub Process');
    await explorer.hasNode(`${processName}.p.json`);
    const start = processEditor.locatorForElementType('g.start\\:callSubStart');
    await expect(start).toBeVisible();
  });

  test('Add web service process', async () => {
    await explorer.addProcess(processName, 'Web Service Process');
    await explorer.hasNode(`${processName}.p.json`);
    const start = processEditor.locatorForElementType('g.start\\:webserviceStart');
    await expect(start).toBeVisible();
  });

  test('Process name validation', async ({ page }) => {
    await explorer.addProcess('default', 'Business Process');
    await expect(page.locator('div.notification-toast-container').first()).toHaveText('Error validating Artifact Name: The entered name "default" is forbidden for this input');
  });
});
