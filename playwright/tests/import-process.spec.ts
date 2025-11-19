import { test } from './fixtures/baseTest';
import { FileExplorer } from './page-objects/explorer-view';
import { ProcessEditor } from './page-objects/process-editor';

test.describe('Create Process', () => {
  let explorer: FileExplorer;
  let processEditor: ProcessEditor;

  test.beforeEach(async ({ page }) => {
    explorer = new FileExplorer(page);
    processEditor = new ProcessEditor(page);
    await processEditor.hasDeployProjectStatusMessage();
    await explorer.selectNode('processes');
  });

  test('Import BPMN Process', async () => {
    await explorer.selectNode('resources');
    await explorer.selectNode('all_elements_diagram.bpmn');
    await explorer.importBpmnProcess('resources/all_elements_diagram.bpmn');
    await explorer.hasNode(`all_elements_diagram.p.json`);
  });
});
