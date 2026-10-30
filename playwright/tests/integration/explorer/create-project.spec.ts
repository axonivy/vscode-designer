import { expect } from '@playwright/test';
import path from 'path';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { ProcessEditor } from '~/page-objects/process-editor';
import { empty, multiProjectWithoutDuplicatesWorkspacePath } from '~/workspaces/workspace';

test.describe('Add Project and execute init Process', () => {
  test.use({ workspace: empty });

  test('Nested Project', { tag: '@serial' }, async ({ wsPage }) => {
    const projectName = 'testProject';
    const explorer = new FileExplorer(wsPage);
    await explorer.addNestedProject('parent', projectName);
    await wsPage.hasReadyStatusMessage();
    await explorer.hasNodeExact(`parent${path.sep}${projectName}`);

    const processEditor = new ProcessEditor(wsPage, 'BusinessProcess.p.json');
    await processEditor.expectWebViewVisible();
    await processEditor.expectHasBreadCrumbs('parent', projectName, 'process', projectName, 'BusinessProcess.p.json');
    const start = processEditor.elementByType('start:requestStart');
    const end = processEditor.elementByType('end:taskEnd');
    await processEditor.startProcessAndAssertExecuted(start, end);
  });
});

test.describe('Project already exists', () => {
  test.use({ workspace: multiProjectWithoutDuplicatesWorkspacePath });

  test('Existing Project', async ({ wsPage }) => {
    const projectName = 'ivy-project-1';
    await wsPage.executeCommand('Axon Ivy: New Project');
    await wsPage.provideUserInput(projectName);
    await expect(wsPage.quickInputMessage).toBeVisible();
    await expect(wsPage.quickInputMessage).toHaveText('A project with this name already exists in the workspace or as a Maven dependency.');
  });
});
