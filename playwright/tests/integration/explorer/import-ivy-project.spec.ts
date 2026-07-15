import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import type { WorkspacePage } from '~/page-objects/workspace-page';
import { empty } from '../../workspaces/workspace';

test.use({ workspace: empty });

test('Import up-to-date Ivy Project', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);

  await assertIarPresent(wsPage);

  await wsPage.executeCommand('Axon Ivy: Import Ivy Project');
  await wsPage.selectItemFromQuickPick('resources');
  await wsPage.selectItemFromQuickPick('ivy-project-up-to-date.iar');
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.hasNode(`ivy-project-up-to-date`);
  await wsPage.hasNoLoggedErrors();
});

async function assertIarPresent(wsPage: WorkspacePage) {
  const explorer = new FileExplorer(wsPage);
  await explorer.selectNode('resources');
  await explorer.hasNode('ivy-project-up-to-date.iar');
  await explorer.selectNode('resources');
}
