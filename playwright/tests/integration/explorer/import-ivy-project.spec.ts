import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { empty, emptyDownloadIarFilenameUpToDate } from '../../workspaces/workspace';

test.use({ workspace: empty });

test('Import up-to-date Ivy Project', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.hasNodeExact(emptyDownloadIarFilenameUpToDate);
  await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
  await wsPage.selectItemFromQuickPick(emptyDownloadIarFilenameUpToDate);
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.hasNodeExact(emptyDownloadIarFilenameUpToDate.replace('.iar', ''));
  await wsPage.hasNoLoggedErrors();
});
