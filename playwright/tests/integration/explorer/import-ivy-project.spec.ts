import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { downloadIar } from '~/utils/download-iar';
import { empty, multiRootWorkspacePath } from '../../workspaces/workspace';

const ivyProjectIar = 'ivy-project.iar';
const ivyProjectIarDuplicateSanitized = 'ivy.project.iar';

test.use({ workspace: empty });

test.beforeEach(async ({ tmpWorkspace }) => {
  await downloadIar(tmpWorkspace.tmpWorkspacePath, ivyProjectIar);
});

test('Import up-to-date Ivy Project', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.hasNodeExact(ivyProjectIar);
  await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
  await wsPage.selectItemFromQuickPick(ivyProjectIar);
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.hasNodeExact(ivyProjectIar.replace('.iar', ''));
  await expect(wsPage.toasts).toBeHidden();
});

test('Import same project error', async ({ wsPage, tmpWorkspace }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.hasNodeExact(ivyProjectIar);
  await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
  await wsPage.selectItemFromQuickPick(ivyProjectIar);
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.hasNodeExact(ivyProjectIar.replace('.iar', ''));
  await expect(wsPage.toasts).toBeHidden();

  await downloadIar(tmpWorkspace.tmpWorkspacePath, ivyProjectIarDuplicateSanitized);
  await explorer.hasNodeExact(ivyProjectIarDuplicateSanitized);
  await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
  await wsPage.selectItemFromQuickPick(ivyProjectIarDuplicateSanitized);

  await expect(wsPage.toasts).toHaveText(
    `File ${tmpWorkspace.tmpWorkspacePath}/${ivyProjectIarDuplicateSanitized} resolves to project name "ivy-project".
Axon Ivy Project with name "ivy-project" already exists in the workspace.
Please either rename the import file ${ivyProjectIarDuplicateSanitized} or delete/rename the existing project.`
  );
});

test.describe('Multi root workspace', () => {
  test.use({ workspace: multiRootWorkspacePath });
  test.skip(process.env.RUN_IN_BROWSER === 'true');

  test('Import Ivy Project into multi-root workspace', async ({ wsPage, tmpWorkspace }) => {
    const explorer = new FileExplorer(wsPage);
    await explorer.hasNodeExact(ivyProjectIar);

    await downloadIar(tmpWorkspace.tmpWorkspacePath, 'connector.iar');
    await explorer.hasNodeExact('connector.iar');
    await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
    await wsPage.selectItemFromQuickPick('connector.iar');

    await expect(wsPage.toasts).toHaveText(
      `File ${tmpWorkspace.tmpWorkspacePath}/connector.iar resolves to project name "connector".
  Axon Ivy Project with name "connector" already exists in the workspace.
  Please either rename the import file connector.iar or delete/rename the existing project.`
    );
  });
});
