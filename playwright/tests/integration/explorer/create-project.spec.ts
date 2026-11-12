import { expect } from '@playwright/test';
import path from 'path';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { ProcessEditor } from '~/page-objects/process-editor';
import { empty, properMultiProjectPath } from '~/workspaces/workspace';

test.describe('Add Project and execute init Process', () => {
  test.use({ workspace: empty });

  test('Nested Project', { tag: '@serial' }, async ({ wsPage }) => {
    const projectName = 'testProject';
    const explorer = new FileExplorer(wsPage);
    await explorer.addNestedProject('parent', projectName);
    await wsPage.hasStatusMessage('Axon Ivy: Success - Invalidating class loader');
    await explorer.hasNodeExact(`parent${path.sep}${projectName}`);

    const processEditor = new ProcessEditor(wsPage, 'BusinessProcess.p.json');
    await processEditor.expectWebViewVisible();
    await processEditor.expectHasBreadCrumbs('parent', projectName, 'process', projectName, 'BusinessProcess.p.json');
    const start = processEditor.elementByType('start:requestStart');
    const end = processEditor.elementByType('end:taskEnd');
    await processEditor.startProcessAndAssertExecuted(start, end);
  });
});

test.describe('Project validation', () => {
  test.use({ workspace: properMultiProjectPath });

  test('Existing Project', async ({ wsPage }) => {
    const projectName = 'ivy-project-1';
    await wsPage.executeCommand('Axon Ivy: New Project');
    await wsPage.provideUserInput(projectName);
    await expect(wsPage.quickInputMessage).toBeVisible();
    await expect(wsPage.quickInputMessage).toHaveText('A project with this name already exists in the workspace or as a Maven dependency.');
  });

  test('Name too long', async ({ wsPage }) => {
    const projectName = 'a'.repeat(39);
    await wsPage.executeCommand('Axon Ivy: New Project');
    await wsPage.provideUserInput(projectName);
    await expect(wsPage.quickInputMessage).toBeVisible();
    await expect(wsPage.quickInputMessage).toHaveText("Press 'Enter' to confirm your input or 'Escape' to cancel");
    await wsPage.page.keyboard.press('Escape');

    const projectNameInvalidChar = projectName + '~';
    await wsPage.executeCommand('Axon Ivy: New Project');
    await wsPage.provideUserInput(projectNameInvalidChar);
    await expect(wsPage.quickInputMessage).toBeVisible();
    await expect(wsPage.quickInputMessage).toHaveText('Only letters, digits, underscores, and hyphens are allowed -- No spaces -- Cannot be empty -- Max 40 characters');

    const projectNameInvalidCharTooLong = projectNameInvalidChar + 'a';
    await wsPage.executeCommand('Axon Ivy: New Project');
    await wsPage.provideUserInput(projectNameInvalidCharTooLong);
    await expect(wsPage.quickInputMessage).toBeVisible();
    await expect(wsPage.quickInputMessage).toHaveText('Project name cannot exceed 40 characters');
  });
});
