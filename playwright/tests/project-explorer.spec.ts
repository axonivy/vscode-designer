import { test } from './fixtures/baseTest';
import { CmsEditor } from './page-objects/cms-editor';
import { FileExplorer, ProjectExplorerView } from './page-objects/explorer-view';
import { multiProjectWorkspacePath, noProjectWorkspacePath } from './workspaces/workspace';

test.describe('Project Explorer - no Ivy Project', () => {
  test.use({ workspace: noProjectWorkspacePath });
  test('Ensure Project Explorer is hidden', async ({ page }) => {
    const explorer = new ProjectExplorerView(page);
    await explorer.isHidden();
  });
});

test.describe('Project Explorer - several Ivy Projects', () => {
  test.use({ workspace: multiProjectWorkspacePath });
  test('Ensure Project Explorer visible', async ({ page }) => {
    const explorer = new ProjectExplorerView(page);
    await explorer.openView();
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
  const explorer = new ProjectExplorerView(page);
  await explorer.hasDeployProjectStatusMessage();
  explorer.openView();
  explorer.selectNode('playwrightTestWorkspace');
  explorer.selectNode('cms');
  await new CmsEditor(page).isViewVisible();
});
