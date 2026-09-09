import { expect } from '@playwright/test';
import path from 'path';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { downloadIar } from '~/utils/download-iar';
import { emptyWithFolder, minimalProjectWorkspacePath, multiRootWorkspacePath } from '../../workspaces/workspace';

const iarFileName = 'ivy-project.iar';
const iarFileNameDuplicateAfterSanitization = 'ivy.project.iar';
const iarProjectName = 'ivy-project';

test.describe('Single root workspace', () => {
  test.use({ workspace: emptyWithFolder });

  test.beforeEach(async ({ wsPage, tmpWorkspace }) => {
    await downloadIar(tmpWorkspace.tmpWorkspacePath, iarFileName);
    const explorer = new FileExplorer(wsPage);
    await explorer.hasNodeExact(iarFileName);
  });

  test('Import up-to-date Ivy Project', async ({ wsPage }) => {
    const explorer = new FileExplorer(wsPage);
    await explorer.hasNodeExact('non-ivy-folder');
    await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick(iarFileName);
    await wsPage.executeCommand('Refresh Explorer');
    await explorer.hasNodeExact(iarProjectName);

    const successToast = wsPage.toasts.filter({ hasText: new RegExp('Successfully imported Ivy project') });
    await expect(successToast).toHaveCount(1);
    await expect(successToast).toContainText('Successfully imported Ivy project(s) from');
  });

  test('Import up-to-date Ivy Project nested non-ivy folder', async ({ wsPage }) => {
    const explorer = new FileExplorer(wsPage);
    await explorer.hasNodeExact('non-ivy-folder');
    await explorer.selectInContextMenuOfNode('non-ivy-folder', 'Axon Ivy', 'Import / Export', 'Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick(iarFileName);
    await wsPage.executeCommand('Refresh Explorer');
    await explorer.selectNode('non-ivy-folder');
    await explorer.hasNodeExact(iarProjectName);

    const successToast = wsPage.toasts.filter({ hasText: new RegExp('Successfully imported Ivy project') });
    await expect(successToast).toHaveCount(1);
    await expect(successToast).toContainText('Successfully imported Ivy project(s) from');
  });

  test('Import same project error', async ({ wsPage, tmpWorkspace }) => {
    const explorer = new FileExplorer(wsPage);
    await explorer.hasNodeExact('non-ivy-folder');
    await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick(iarFileName);
    await wsPage.executeCommand('Refresh Explorer');
    await explorer.hasNodeExact(iarProjectName);

    const successToast = wsPage.toasts.filter({ hasText: new RegExp('Successfully imported Ivy project') });
    await expect(successToast).toHaveCount(1);
    await expect(successToast).toContainText('Successfully imported Ivy project(s) from');

    await downloadIar(tmpWorkspace.tmpWorkspacePath, iarFileNameDuplicateAfterSanitization);
    await explorer.hasNodeExact(iarFileNameDuplicateAfterSanitization);
    await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick(iarFileNameDuplicateAfterSanitization);

    const errorToast = wsPage.toasts.filter({ hasText: new RegExp('Axon Ivy Import Error -') });
    await expect(errorToast).toHaveCount(1);
    await expect(errorToast).toContainText(`resolves to project name "${iarProjectName}`);
    await expect(errorToast).toContainText(`Axon Ivy Project with name "${iarProjectName}" already exists in the workspace`);
    await expect(errorToast).toContainText(`Please either rename the import file ${iarFileNameDuplicateAfterSanitization} or delete/rename the existing project.`);
  });

  test.describe('Single root workspace with existing ivy project', () => {
    test.use({ workspace: minimalProjectWorkspacePath });

    test('Import nested inside ivy project error', async ({ wsPage }) => {
      await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');

      const errorToast = wsPage.toasts.filter({ hasText: new RegExp('Axon Ivy Import Error -') });
      await expect(errorToast).toHaveCount(1);
      await expect(errorToast).toContainText(
        'Cannot import an Axon Ivy Project into an existing Axon Ivy Project. Select a valid directory which is not inside an existing Axon Ivy Project.'
      );
    });
  });
});

test.describe('Multi root workspace', () => {
  test.use({ workspace: multiRootWorkspacePath });
  test.skip(process.env.RUN_IN_BROWSER === 'true');

  test('Import existing project by name into multi-root workspace error', async ({ wsPage, tmpWorkspace }) => {
    const iarFileName = 'connector.iar';
    const iarProjectName = 'connector';
    const downloadIarFolder = 'connector';
    await downloadIar(path.join(tmpWorkspace.tmpWorkspacePath, downloadIarFolder), iarFileName);

    const explorer = new FileExplorer(wsPage);
    await explorer.hasNodeExact(iarFileName);
    await explorer.selectInContextMenuOfNode('non-ivy-folder', 'Axon Ivy', 'Import / Export', 'Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick(iarFileName);

    const errorToast = wsPage.toasts.filter({ hasText: new RegExp('Axon Ivy Import Error -') });
    await expect(errorToast).toHaveCount(1);
    await expect(wsPage.toasts).toContainText(`resolves to project name "${iarProjectName}"`);
    await expect(wsPage.toasts).toContainText(`Axon Ivy Project with name "${iarProjectName}" already exists in the workspace.`);
    await expect(wsPage.toasts).toContainText(`Please either rename the import file ${iarFileName} or delete/rename the existing project.`);
  });

  test('Import existing folder into multi-root workspace error', async ({ wsPage, tmpWorkspace }) => {
    const iarFileName = 'already-present.iar';
    const downloadIarFolder = 'connector';

    const explorer = new FileExplorer(wsPage);
    await downloadIar(path.join(tmpWorkspace.tmpWorkspacePath, downloadIarFolder), iarFileName);

    await explorer.selectInContextMenuOfNode('non-ivy-folder', 'Axon Ivy', 'Import / Export', 'Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick(iarFileName);

    const errorToast = wsPage.toasts.filter({ hasText: new RegExp('Axon Ivy Import Error -') });
    await expect(errorToast).toHaveCount(1);
    await expect(wsPage.toasts).toContainText('Import target folder after project name resolution is');
    await expect(wsPage.toasts).toContainText('which already exists in your workspace.');
    await expect(wsPage.toasts).toContainText(`Please either rename the import file ${iarFileName} or delete/rename the existing folder.`);
  });
});
