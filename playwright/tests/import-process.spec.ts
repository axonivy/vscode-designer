import { test } from './fixtures/baseTest';
import { FileExplorer } from './page-objects/explorer-view';
import { ProcessEditor } from './page-objects/process-editor';

test('Import BPMN Process', async ({ page }) => {
  const processEditor = new ProcessEditor(page);
  await processEditor.hasDeployProjectStatusMessage();
  const explorer = new FileExplorer(page);
  await explorer.selectNode('processes');

  await explorer.selectNode('resources');
  await explorer.selectNode('all_elements_diagram.bpmn');
  await explorer.importBpmnProcess('resources/all_elements_diagram.bpmn');
  await explorer.hasNode(`all_elements_diagram.p.json`);
});
