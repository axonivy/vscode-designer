import { test } from './fixtures/baseTest';
import { CmsEditor } from './page-objects/cms-editor';
import { IvyViewContainer } from './page-objects/ivy-view-container';
import { multiProjectWorkspacePath } from './workspaces/workspace';

test.describe('Project Explorer', () => {
  test.use({ workspace: multiProjectWorkspacePath });
  test('Projects are visible', async ({ page }) => {
    const viewContainer = new IvyViewContainer(page);
    await viewContainer.openViewContainer();
    const explorer = viewContainer.projectExplorer;

    await explorer.hasNode('ivy-project-1');
    await explorer.hasNode('ivy-project-2');
    await explorer.hasNoNode('ivy-project-3');
    await explorer.hasNoNode('no-ivy-project');
    await explorer.hasNoNode('excluded');
  });
});

test('CMS entry', async ({ page }) => {
  const viewContainer = new IvyViewContainer(page);
  viewContainer.hasDeployProjectStatusMessage();
  await viewContainer.openViewContainer();
  const explorer = viewContainer.projectExplorer;

  explorer.selectNode('playwrightTestWorkspace');
  explorer.selectNode('cms');
  await new CmsEditor(page).isViewVisible();
});
