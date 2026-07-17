import { test } from '~/fixtures/baseTest';
import { CmsEditor } from '~/page-objects/cms-editor';
import { FileExplorer, ProjectExplorerView } from '~/page-objects/explorer-view';
import { ProblemsView } from '~/page-objects/problems-view';
import { ProcessEditor } from '~/page-objects/process-editor';
import { minimalProjectWorkspacePath, multiProjectWorkspacePath, multiRootWorkspacePath } from '~/workspaces/workspace';

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

test.describe('CMS entry', () => {
  test('Open', async ({ wsPage }) => {
    const explorer = new ProjectExplorerView(wsPage);
    await explorer.openView();

    await explorer.selectNode('playwrightTestWorkspace');
    await explorer.selectNode('cms');
    await new CmsEditor(wsPage).expectWebViewVisible();
  });

  test('Reveal and select when CMS Editor tab is active', async ({ wsPage }) => {
    const editor = new CmsEditor(wsPage);
    const fileExplorer = new FileExplorer(wsPage);
    const projectExplorer = new ProjectExplorerView(wsPage);

    await fileExplorer.selectNode('cms');
    await wsPage.executeCommand('Axon Ivy: Open CMS Editor');
    await editor.expectWebViewVisible();

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
    await editor.expectTabInactive();
    await projectExplorer.hasNoNode('cms');
    await editor.tab.click();
    await projectExplorer.isSelected('cms');
  });
});

test.describe('Context menu', () => {
  test.use({ workspace: minimalProjectWorkspacePath });

  test('New Resource', async ({ wsPage }) => {
    const explorer = new ProjectExplorerView(wsPage);
    await explorer.openView();
    await explorer.selectNode('playwrightTestWorkspace');
    await explorer.selectInContextMenuOfNode('cms', 'New', 'New Business Process');
    await wsPage.provideUserInput('TestProcess');
    await wsPage.provideUserInput('TestNamespace');
    await new ProcessEditor(wsPage, 'TestProcess.p.json').expectWebViewVisible();
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
