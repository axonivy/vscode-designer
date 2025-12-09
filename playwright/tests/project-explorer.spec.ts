import { test } from './fixtures/baseTest';
import { CmsEditor } from './page-objects/cms-editor';
import { FileExplorer } from './page-objects/explorer-view';
import { IvyViewContainer } from './page-objects/ivy-view-container';
import { multiProjectWorkspacePath } from './workspaces/workspace';

test.describe('Project Explorer - several Ivy Projects', () => {
  test.use({ workspace: multiProjectWorkspacePath });
  test('Ensure Project Explorer visible', async ({ page }) => {
    const viewContainer = new IvyViewContainer(page);
    await viewContainer.openViewContainer();
    const explorer = viewContainer.projectExplorer;

    await explorer.hasNode('ivy-project-1');
    await explorer.hasNode('ivy-project-2');
    await explorer.hasNoNode('ivy-project-3');
    await explorer.hasNoNode('no-ivy-project');
    await explorer.hasNoNode('excluded');

    await explorer.selectNode('ivy-project-1');
    await explorer.revealInExplorer('dummy.txt');
    const fileExplorer = new FileExplorer(page);
    await fileExplorer.isSelected('dummy.txt');
    await explorer.closeView();
  });
});

test('cms entry', async ({ page }) => {
  const viewContainer = new IvyViewContainer(page);
  await viewContainer.openViewContainer();
  const explorer = viewContainer.projectExplorer;

  await explorer.hasDeployProjectStatusMessage();
  explorer.selectNode('playwrightTestWorkspace');
  explorer.selectNode('cms');
  await new CmsEditor(page).isViewVisible();
});
