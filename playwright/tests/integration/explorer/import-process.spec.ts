import path from 'path';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';

test('Import BPMN Process', async ({ wsPage, tmpWorkspace }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.selectNode('process');

  await wsPage.executeCommand('Axon Ivy: Import BPMN Process');
  await wsPage.selectFileFromQuickPick(path.join(tmpWorkspace!.tmpWorkspacePath, 'resources', 'all_elements_diagram.bpmn'));
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.hasNodeExact(`all_elements_diagram.p.json`);
});
