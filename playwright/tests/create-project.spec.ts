import path from 'path';
import { test } from './fixtures/baseTest';
import { FileExplorer } from './page-objects/explorer-view';
import { ProblemsView } from './page-objects/problems-view';
import { ProcessEditor } from './page-objects/process-editor';
import { empty } from './workspaces/workspace';

test.describe('Create Project', () => {
  test.use({ workspace: empty });

  test('Add Project and execute init Process', async ({ page }) => {
    const explorer = new FileExplorer(page);
    await explorer.addNestedProject('parent', 'testProject');
    await explorer.hasStatusMessage('Finished: Create new Project', 60_000);
    await explorer.hasNode(`parent${path.sep}testProject`);

    const problemsView = await ProblemsView.initProblemsView(page);
    await problemsView.hasNoMarker();

    const processEditor = new ProcessEditor(page, 'BusinessProcess.p.json');
    await processEditor.isViewVisible();
    await processEditor.hasBreadCrumbs('parent', 'testProject', 'processes', 'testProject', 'BusinessProcess.p.json');
    const start = processEditor.locatorForElementType('g.start\\:requestStart');
    const end = processEditor.locatorForElementType('g.end\\:taskEnd');
    await processEditor.startProcessAndAssertExecuted(start, end);
  });
});
