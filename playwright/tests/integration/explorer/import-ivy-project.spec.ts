import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { runDownloadIar } from '~/utils/download-iar';
import { empty, emptyDownloadIarFilenameUpToDate } from '../../workspaces/workspace';

test.use({ workspace: empty });

// test.beforeEach(async () => {
//   await runDownloadIar(empty, emptyDownloadIarFilenameUpToDate);
// });

test('Import up-to-date Ivy Project', async ({ wsPage }) => {
  await runDownloadIar(empty, emptyDownloadIarFilenameUpToDate);

  const explorer = new FileExplorer(wsPage);
  await explorer.hasNodeExact(emptyDownloadIarFilenameUpToDate);
  await wsPage.executeCommand('Import Axon Ivy Project Archive (.iar or .zip)');
  await wsPage.selectItemFromQuickPick(emptyDownloadIarFilenameUpToDate);
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.hasNodeExact(emptyDownloadIarFilenameUpToDate.replace('.iar', ''));
  await wsPage.hasNoLoggedErrors();
});
