import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { downloadIar } from '~/utils/download-iar';
import { empty } from '../../workspaces/workspace';

const ivyProjectIar = 'ivy-project.iar';

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
