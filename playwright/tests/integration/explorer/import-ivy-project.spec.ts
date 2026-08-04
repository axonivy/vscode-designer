import { expect } from '@playwright/test';
import path from 'path';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { downloadIar } from '~/utils/download-iar';
import { empty, multiRootWorkspacePath } from '../../workspaces/workspace';

const ivyProjectIar = 'ivy-project.iar';
const ivyProjectIarDuplicateSanitized = 'ivy.project.iar';
const ivyProjectName = 'ivy-project';

test.describe('Single root workspace', () => {
  test.use({ workspace: empty });

  test.beforeEach(async ({ tmpWorkspace }) => {
    await downloadIar(tmpWorkspace.tmpWorkspacePath, ivyProjectIar);
  });

  test('Import up-to-date Ivy Project', async ({ wsPage, tmpWorkspace }) => {
    const iarFilePath = path.join(tmpWorkspace.tmpWorkspacePath, ivyProjectIar);
    const targetWorkspacePath = path.normalize(tmpWorkspace.tmpWorkspacePath);

    const explorer = new FileExplorer(wsPage);
    await explorer.hasNodeExact(ivyProjectIar);
    await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick(ivyProjectIar);
    await wsPage.executeCommand('Refresh Explorer');
    await explorer.hasNodeExact(ivyProjectIar.replace('.iar', ''));

    const successToast = wsPage.toasts.filter({ hasText: new RegExp('Successfully imported Ivy project') });
    await expect(successToast).toHaveCount(1);
    await expect(successToast).toContainText(`Successfully imported Ivy project(s) from ${iarFilePath} into workspace folder ${targetWorkspacePath}`);
  });

  test('Import same project error', async ({ wsPage, tmpWorkspace }) => {
    const iarFilePath = path.join(tmpWorkspace.tmpWorkspacePath, ivyProjectIar);
    const targetWorkspacePath = path.normalize(tmpWorkspace.tmpWorkspacePath);

    const explorer = new FileExplorer(wsPage);
    await explorer.hasNodeExact(ivyProjectIar);
    await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick(ivyProjectIar);
    await wsPage.executeCommand('Refresh Explorer');
    await explorer.hasNodeExact(ivyProjectIar.replace('.iar', ''));

    const successToast = wsPage.toasts.filter({ hasText: new RegExp('Successfully imported Ivy project') });
    await expect(successToast).toHaveCount(1);
    await expect(successToast).toContainText(`Successfully imported Ivy project(s) from ${iarFilePath} into workspace folder ${targetWorkspacePath}`);

    await downloadIar(tmpWorkspace.tmpWorkspacePath, ivyProjectIarDuplicateSanitized);
    await explorer.hasNodeExact(ivyProjectIarDuplicateSanitized);
    await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick(ivyProjectIarDuplicateSanitized);

    const errorToast = wsPage.toasts.filter({ hasText: new RegExp('Axon Ivy Import Error -') });
    await expect(errorToast).toHaveCount(1);
    await expect(errorToast).toContainText(
      `File ${path.join(tmpWorkspace.tmpWorkspacePath, ivyProjectIarDuplicateSanitized)} resolves to project name "${ivyProjectName}".
Axon Ivy Project with name "${ivyProjectName}" already exists in the workspace.
Please either rename the import file ${ivyProjectIarDuplicateSanitized} or delete/rename the existing project.`
    );
  });
});

test.describe('Multi root workspace', () => {
  test.use({ workspace: multiRootWorkspacePath });
  test.skip(process.env.RUN_IN_BROWSER === 'true');

  test('Import existing project by name into multi-root workspace error', async ({ wsPage, tmpWorkspace }) => {
    const iarFileName = 'connector.iar';
    const targetFolderName = iarFileName.replace('.iar', '');
    const projectName = iarFileName.replace('.iar', '');
    const iarFilePath = path.join(tmpWorkspace.tmpWorkspacePath, targetFolderName, iarFileName);

    const explorer = new FileExplorer(wsPage);
    await downloadIar(path.join(tmpWorkspace.tmpWorkspacePath, targetFolderName), iarFileName);

    await explorer.hasNodeExact(iarFileName);
    await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick('ivy-project-1');
    await wsPage.selectItemFromQuickPick(iarFileName);

    const errorToast = wsPage.toasts.filter({ hasText: new RegExp('Axon Ivy Import Error -') });
    await expect(errorToast).toHaveCount(1);
    await expect(wsPage.toasts).toContainText(
      `File ${iarFilePath} resolves to project name "${projectName}".
Axon Ivy Project with name "${projectName}" already exists in the workspace.
Please either rename the import file ${iarFileName} or delete/rename the existing project.`
    );
  });

  test('Import existing folder into multi-root workspace error', async ({ wsPage, tmpWorkspace }) => {
    const iarFileName = 'dummy.iar';
    const iarTargetFolder = 'connector';
    const iarDownloadPath = path.join(tmpWorkspace.tmpWorkspacePath, iarTargetFolder);
    const targetFolderName = iarFileName.replace('.iar', '');
    const targetFolderPath = path.join(tmpWorkspace.tmpWorkspacePath, iarTargetFolder, targetFolderName);

    const explorer = new FileExplorer(wsPage);
    await downloadIar(iarDownloadPath, iarFileName);

    await explorer.addFolder(targetFolderName);
    await explorer.hasNodeExact(targetFolderName);
    await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick(iarTargetFolder);
    await wsPage.selectItemFromQuickPick(iarFileName);

    const errorToast = wsPage.toasts.filter({ hasText: new RegExp('Axon Ivy Import Error -') });
    await expect(errorToast).toHaveCount(1);
    await expect(wsPage.toasts).toContainText(
      `Import target folder after project name resolution is ${targetFolderPath} which already exists in your workspace.
Please either rename the import file ${iarFileName} or delete/rename the existing folder.`
    );
  });
});
