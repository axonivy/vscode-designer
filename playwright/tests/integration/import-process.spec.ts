import { test } from '../fixtures/baseTest';
import { FileExplorer } from '../page-objects/explorer-view';

test('Import BPMN Process', async ({ page }) => {
  const explorer = new FileExplorer(page);
  await explorer.selectNode('processes');

  await explorer.executeCommand('Axon Ivy: Import BPMN Process');
  await explorer.selectItemFromQuickPick('resources');
  await explorer.selectItemFromQuickPick('all_elements_diagram.bpmn');
  await explorer.executeCommand('Refresh Explorer');
  await explorer.hasNode(`all_elements_diagram.p.json`);
});
