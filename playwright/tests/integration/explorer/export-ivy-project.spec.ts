import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';

test('Export Ivy Project .iar', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await wsPage.executeCommand('Axon Ivy: Export Axon Ivy Project Archive (.iar)', 'playwrightTestWorkspace');
  await wsPage.page.getByRole('button', { name: 'Select folder' }).click();
  await wsPage.provideUserInput('testExportIar');
  await explorer.hasNodeExact('testExportIar.iar');
});
