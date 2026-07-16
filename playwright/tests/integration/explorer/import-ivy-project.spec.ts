import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { empty, emptyDownloadIarFilenameUptodate } from '../../workspaces/workspace';

test.use({ workspace: empty });

// eslint-disable-next-line playwright/no-focused-test
test.only('Import up-to-date Ivy Project', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.hasNodeExact(emptyDownloadIarFilenameUptodate);
  await wsPage.executeCommand('Axon Ivy: Import Ivy Project');
  await wsPage.selectItemFromQuickPick(emptyDownloadIarFilenameUptodate);
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.hasNodeExact(emptyDownloadIarFilenameUptodate.replace('.iar', ''));
  await wsPage.hasNoLoggedErrors();
});
