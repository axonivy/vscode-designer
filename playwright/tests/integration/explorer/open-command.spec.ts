import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { minimalProjectWorkspacePath } from '~/workspaces/workspace';

test.use({ workspace: minimalProjectWorkspacePath });

test('creates configuration files when opening editors', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.hasNoNode('config');

  await wsPage.executeCommand('Axon Ivy: Open Role Editor');
  await wsPage.executeCommand('Axon Ivy: Open Database Editor');

  await explorer.hasNodeExact('config');
  await explorer.hasNodeExact('roles.yaml');
  await explorer.hasNodeExact('databases.yaml');
});
