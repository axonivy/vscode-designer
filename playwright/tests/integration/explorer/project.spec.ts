import { expect, test } from '~/fixtures/baseTest';
import { FileExplorer, ProjectExplorerView } from '~/page-objects/explorer-view';
import { ProblemsView } from '~/page-objects/problems-view';
import { multiProjectWithoutDuplicatesWorkspacePath, multiProjectWorkspacePath, multiRootWorkspacePath } from '~/workspaces/workspace';

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
    await problemsView.hasError("Multiple project directories resolve to the same name 'ivy-project-duplicated'");
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

test.describe('Delete project', () => {
  test.use({ workspace: multiProjectWithoutDuplicatesWorkspacePath });

  test('Delete existing project', async ({ wsPage }) => {
    const fileExplorer = new FileExplorer(wsPage);
    const projectExplorer = new ProjectExplorerView(wsPage);
    await projectExplorer.openView();
    await projectExplorer.hasNodeExact('ivy-project-1');
    await fileExplorer.view.getByText('ivy-project-1').click({ button: 'right' });
    await wsPage.page.getByRole('menu').getByRole('menuitem', { name: 'Delete' }).click({ delay: 500 });
    await fileExplorer.hasNoNode('ivy-project-1');
    await projectExplorer.hasNoNode('ivy-project-1');
    await expect(wsPage.page.locator('div.quick-input-widget')).toContainText('Reload Java workspace and window');
  });
});
