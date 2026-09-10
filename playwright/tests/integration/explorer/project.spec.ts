import { test } from '~/fixtures/baseTest';
import { ProjectExplorerView } from '~/page-objects/explorer-view';
import { ProblemsView } from '~/page-objects/problems-view';
import { multiProjectWorkspacePath, multiRootWorkspacePath } from '~/workspaces/workspace';

test.describe('Project Explorer', () => {
  test.use({ workspace: multiProjectWorkspacePath });

  test('Projects are visible', async ({ wsPage }) => {
    const explorer = new ProjectExplorerView(wsPage);
    await explorer.openView();

    await explorer.hasNodeExact('ivy-project-1');
    await explorer.hasNodeExact('ivy-project-2');
    await explorer.hasNoNode('ivy-project-3');
    await explorer.hasNoNode('no-ivy-project');
    await explorer.hasNoNode('exclude-me');
    await explorer.hasNoNode('ivy-project-duplicated');
    const problemsView = await ProblemsView.initProblemsView(wsPage);
    await problemsView.hasError("Multiple project directories with the same name 'ivy-project-duplicated' found:");
  });
});

test.describe('Multi root workspace', () => {
  test.use({ workspace: multiRootWorkspacePath });
  test.skip(process.env.RUN_IN_BROWSER === 'true');

  test('Projects from workspace config are shown', async ({ wsPage }) => {
    const explorer = new ProjectExplorerView(wsPage);
    await explorer.openView();

    await explorer.hasNodeExact('ivy-project-1');
    await explorer.hasNodeExact('connector');
    await explorer.hasNoNode('ivy-project-2');
  });
});
