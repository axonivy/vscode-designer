import { expect } from '@playwright/test';
import path from 'path';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { ProblemsView } from '~/page-objects/problems-view';
import { ProcessEditor } from '~/page-objects/process-editor';
import { empty, multiProjectWorkspacePath } from '~/workspaces/workspace';

test.describe('Add Project and execute init Process', () => {
  test.use({ workspace: empty });

  test('Nested Project', { tag: '@serial' }, async ({ wsPage }) => {
    const projectName = 'testProject';
    const explorer = new FileExplorer(wsPage);
    await explorer.addNestedProject('parent', projectName);
    await wsPage.hasReadyStatusMessage();
    await explorer.hasNodeExact(`parent${path.sep}${projectName}`);

    const problemsView = await ProblemsView.initProblemsView(wsPage);
    await problemsView.hasNumOfMarkers(1);
    await problemsView.hasWarning('Jandex index file of \\"testProject\\" is missing');

    const processEditor = new ProcessEditor(wsPage, 'BusinessProcess.p.json');
    await processEditor.expectWebViewVisible();
    await processEditor.expectHasBreadCrumbs('parent', projectName, 'process', projectName, 'BusinessProcess.p.json');
    const start = processEditor.elementByType('start:requestStart');
    const end = processEditor.elementByType('end:taskEnd');
    await processEditor.startProcessAndAssertExecuted(start, end);
  });
});

test.describe('Project already exists', () => {
  test.use({ workspace: multiProjectWorkspacePath });

  test('Existing Project', async ({ wsPage }) => {
    const projectName = 'ivy-project-1';
    await wsPage.hasReadyStatusMessage();

    await wsPage.executeCommand('Axon Ivy: New Project');
    await wsPage.provideUserInput(projectName);
    const quickInputMessage = wsPage.page.locator('div.quick-input-message');
    await expect(quickInputMessage).toBeVisible();
    await expect(quickInputMessage).toHaveText('A project with this name already exists in the workspace or as a Maven dependency.');
  });
});
