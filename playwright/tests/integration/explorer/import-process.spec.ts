import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';

test('Import BPMN Process', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.selectNode('processes');

  await wsPage.executeCommand('Axon Ivy: Import BPMN Process');
  await wsPage.selectItemFromQuickPick('resources');
  await wsPage.selectItemFromQuickPick('all_elements_diagram.bpmn');
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.hasNode(`all_elements_diagram.p.json`);
});
