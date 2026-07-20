import path from 'path';
import { test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { ProblemsView } from '~/page-objects/problems-view';
import { ProcessEditor } from '~/page-objects/process-editor';
import { empty } from '~/workspaces/workspace';

test.use({ workspace: empty });

test('Add Project and execute init Process', { tag: '@serial' }, async ({ wsPage }) => {
  const projectName = 'testProject';
  const explorer = new FileExplorer(wsPage);
  await explorer.addNestedProject('parent', projectName);
  await wsPage.hasReadyStatusMessage();
  await explorer.hasNodeExact(`parent${path.sep}${projectName}`);

  const problemsView = await ProblemsView.initProblemsView(wsPage);
  await problemsView.hasNoMarker();

  const processEditor = new ProcessEditor(wsPage, 'BusinessProcess.p.json');
  await processEditor.expectWebViewVisible();
  await processEditor.expectHasBreadCrumbs('parent', projectName, 'processes', projectName, 'BusinessProcess.p.json');
  const start = processEditor.elementByType('start:requestStart');
  const end = processEditor.elementByType('end:taskEnd');
  await processEditor.startProcessAndAssertExecuted(start, end);
});
