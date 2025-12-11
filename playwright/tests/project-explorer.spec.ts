import { test } from './fixtures/baseTest';
import { CmsEditor } from './page-objects/cms-editor';
import { ExplorerViewContainer, IvyViewContainer } from './page-objects/view-container';
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

test.describe('CMS entry', () => {
  test('Open', async ({ page }) => {
    const viewContainer = new IvyViewContainer(page);
    await viewContainer.hasDeployProjectStatusMessage();
    await viewContainer.openViewContainer();
    const explorer = viewContainer.projectExplorer;

    await explorer.selectNode('playwrightTestWorkspace');
    await explorer.selectNode('cms');
    await new CmsEditor(page).isViewVisible();
  });

  test('Reveal and select when CMS Editor tab is active', async ({ page }) => {
    const editor = new CmsEditor(page);
    const explorerViewContainer = new ExplorerViewContainer(page);
    const ivyViewContainer = new IvyViewContainer(page);

    await editor.hasDeployProjectStatusMessage();
    await explorerViewContainer.fileExplorer.selectNode('cms');
    await editor.executeCommand('Axon Ivy: Open CMS Editor');
    await editor.isViewVisible();

    await ivyViewContainer.openViewContainer();
    await ivyViewContainer.projectExplorer.isSelected('cms');

    await ivyViewContainer.projectExplorer.selectNode('playwrightTestWorkspace');
    await ivyViewContainer.projectExplorer.hasNoNode('cms');
    await explorerViewContainer.openViewContainer();
    await ivyViewContainer.openViewContainer();
    await ivyViewContainer.projectExplorer.isSelected('cms');

    await ivyViewContainer.projectExplorer.selectNode('playwrightTestWorkspace');
    await ivyViewContainer.projectExplorer.hasNoNode('cms');
    await explorerViewContainer.openViewContainer();
    await explorerViewContainer.fileExplorer.doubleClickNode('pom.xml');
    await ivyViewContainer.openViewContainer();
    await editor.isInactive();
    await ivyViewContainer.projectExplorer.hasNoNode('cms');
    await editor.tabLocator.click();
    await ivyViewContainer.projectExplorer.isSelected('cms');
  });
});
