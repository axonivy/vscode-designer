import path from 'path';
import { expect, test } from '../fixtures/baseTest';
import { FileExplorer } from '../page-objects/explorer-view';
import { ProblemsView } from '../page-objects/problems-view';
import { ProcessEditor } from '../page-objects/process-editor';
import { empty } from '../workspaces/workspace';

test.describe('Create Project', () => {
  test.use({ workspace: empty });

  test('Add Project and execute init Process', async ({ page }) => {
    const projectName = 'testProject';
    const explorer = new FileExplorer(page);
    await explorer.addNestedProject('parent', projectName);
    await explorer.hasStatusMessage('Axon Ivy: Success: Refreshing project statuses');
    await explorer.hasReadyStatusMessage();
    await explorer.hasNode(`parent${path.sep}${projectName}`);

    const problemsView = await ProblemsView.initProblemsView(page);
    await problemsView.hasNoMarker();

    const processEditor = new ProcessEditor(page, 'BusinessProcess.p.json');
    await processEditor.isViewVisible();
    await processEditor.hasBreadCrumbs('parent', projectName, 'processes', projectName, 'BusinessProcess.p.json');
    const start = processEditor.locatorForElementType('g.start\\:requestStart');
    const end = processEditor.locatorForElementType('g.end\\:taskEnd');
    await expect(async () => {
      await processEditor.startProcessAndAssertExecuted(start, end, { timeout: 1_000 });
    }).toPass({ intervals: [500] });
  });
});
