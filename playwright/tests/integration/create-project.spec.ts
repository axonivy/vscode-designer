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
    await explorer.hasReadyStatusMessage();
    await explorer.addNestedProject('parent', projectName);
    await expect(page.locator('div.notification-list-item').filter({ hasText: 'Java extension could not import project.' })).toBeVisible();
    await explorer.hasReadyStatusMessage();
    await explorer.hasNode(`parent${path.sep}${projectName}`);

    const problemsView = await ProblemsView.initProblemsView(page);
    await problemsView.hasNoMarker();

    const processEditor = new ProcessEditor(page, 'BusinessProcess.p.json');
    await processEditor.isViewVisible();
    await processEditor.hasBreadCrumbs('parent', projectName, 'processes', projectName, 'BusinessProcess.p.json');
    const start = processEditor.locatorForElementType('g.start\\:requestStart');
    const end = processEditor.locatorForElementType('g.end\\:taskEnd');
    await processEditor.startProcessAndAssertExecuted(start, end);
  });
});
