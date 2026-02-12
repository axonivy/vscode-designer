import { test } from './fixtures/baseTest';
import { CmsEditor } from './page-objects/cms-editor';
import { FileExplorer, ProjectExplorerView } from './page-objects/explorer-view';
import { ProcessEditor } from './page-objects/process-editor';
import { minimalProjectWorkspacePath, multiProjectWorkspacePath } from './workspaces/workspace';

test.describe('Project Explorer', () => {
  test.use({ workspace: multiProjectWorkspacePath });

  test('Projects are visible', async ({ page }) => {
    const explorer = new ProjectExplorerView(page);
    await explorer.openView();

    await explorer.hasNode('ivy-project-1');
    await explorer.hasNode('ivy-project-2');
    await explorer.hasNoNode('ivy-project-3');
    await explorer.hasNoNode('no-ivy-project');
    await explorer.hasNoNode('exclude-me');
  });
});

test.describe('CMS entry', () => {
  test('Open', async ({ page }) => {
    const explorer = new ProjectExplorerView(page);
    await explorer.hasDeployProjectStatusMessage();
    await explorer.openView();

    await explorer.selectNode('playwrightTestWorkspace');
    await explorer.selectNode('cms');
    await new CmsEditor(page).isViewVisible();
  });

  test('Reveal and select when CMS Editor tab is active', async ({ page }) => {
    const editor = new CmsEditor(page);
    const fileExplorer = new FileExplorer(page);
    const projectExplorer = new ProjectExplorerView(page);

    await editor.hasDeployProjectStatusMessage();
    await fileExplorer.selectNode('cms');
    await editor.executeCommand('Axon Ivy: Open CMS Editor');
    await editor.isViewVisible();

    await projectExplorer.openView();
    await projectExplorer.isSelected('cms');

    await projectExplorer.selectNode('playwrightTestWorkspace');
    await projectExplorer.hasNoNode('cms');
    await projectExplorer.closeView();
    await projectExplorer.openView();
    await projectExplorer.isSelected('cms');

    await projectExplorer.selectNode('playwrightTestWorkspace');
    await projectExplorer.hasNoNode('cms');
    await projectExplorer.closeView();
    await fileExplorer.doubleClickNode('pom.xml');
    await projectExplorer.openView();
    await editor.isInactive();
    await projectExplorer.hasNoNode('cms');
    await editor.tabLocator.click();
    await projectExplorer.isSelected('cms');
  });

  test.describe('Context menu', () => {
    test.use({ workspace: minimalProjectWorkspacePath });

    test('New Resource', async ({ page }) => {
      const explorer = new ProjectExplorerView(page);
      await explorer.hasDeployProjectStatusMessage();
      await explorer.openView();
      await explorer.selectNode('playwrightTestWorkspace');
      await explorer.selectInContextMenuOfNode('cms', 'New', 'New Business Process');
      await explorer.provideUserInput('TestProcess');
      await explorer.provideUserInput('TestNamespace');
      await new ProcessEditor(page, 'TestProcess.p.json').isViewVisible();
    });
  });
});
