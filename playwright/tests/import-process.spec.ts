import { test } from './fixtures/baseTest';
import { FileExplorer } from './page-objects/explorer-view';

test('Import BPMN Process', async ({ page }) => {
  const explorer = new FileExplorer(page);
  await explorer.hasDeployProjectStatusMessage();
  await explorer.selectNode('processes');

  await explorer.selectNode('resources');
  await explorer.selectNode('all_elements_diagram.bpmn');
  await explorer.importBpmnProcess('all_elements_diagram.bpmn');
  await explorer.executeCommand('Refresh Explorer');
  await explorer.hasNode(`all_elements_diagram.p.json`);
});
