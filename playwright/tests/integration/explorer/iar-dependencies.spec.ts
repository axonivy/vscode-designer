import path from 'path';
import { expect, test } from '~/fixtures/baseTest';
import { TextEditor } from '~/page-objects/editor';
import { ProjectExplorerView } from '~/page-objects/explorer-view';
import { installTestIar, testIarCoordinates } from '~/utils/test-iar';
import { iarDependencyWorkspacePath } from '~/workspaces/workspace';

const projectExplorerItem = testIarCoordinates.artifactId;

test.beforeAll(async () => {
  await installTestIar();
});

test.describe('IAR project dependencies', () => {
  test.use({ workspace: iarDependencyWorkspacePath });

  test('shows the IAR dependencies', async ({ wsPage, tmpWorkspace }) => {
    const projectName = path.basename(tmpWorkspace!.tmpWorkspacePath);
    const projectExplorer = new ProjectExplorerView(wsPage);
    await projectExplorer.openView();
    await projectExplorer.hasNodeExactCollapsible(projectName);
    await projectExplorer.expandNodeExact(projectName);
    await projectExplorer.expandNodeExact('IAR Dependencies');

    const iarProject = projectExplorer.view.getByRole('treeitem').filter({ hasText: projectExplorerItem }).first();
    await expect(iarProject).toContainText(testIarCoordinates.version);
    await expect(iarProject.locator('.codicon-lock')).toBeVisible();

    await projectExplorer.expandNodeExact(projectExplorerItem);
    await projectExplorer.hasNodeExact('config');
    await projectExplorer.expandNodeExact('config');
    await projectExplorer.scrollToNodeExact('rest-clients.yaml');
    await projectExplorer.hasNodeExact('rest-clients.yaml');
  });

  test('opens an IAR file in the text editor and keeps it read-only', async ({ wsPage, tmpWorkspace }) => {
    const projectName = path.basename(tmpWorkspace!.tmpWorkspacePath);
    const projectExplorer = new ProjectExplorerView(wsPage);
    await projectExplorer.openView();
    await projectExplorer.hasNodeExactCollapsible(projectName);
    await projectExplorer.expandNodeExact(projectName);
    await projectExplorer.expandNodeExact('IAR Dependencies');
    await projectExplorer.expandNodeExact(projectExplorerItem);
    await projectExplorer.expandNodeExact('config');
    await projectExplorer.scrollToNodeExact('rest-clients.yaml');
    await projectExplorer.selectNodeExact('rest-clients.yaml');

    // TODO: Replace with web editor as soon as supported
    const editor = new TextEditor(wsPage, 'rest-clients.yaml');
    await editor.expectTabVisible();
    await editor.expectTabActive();
    await editor.expectTabNotDirty();
    await expect(editor.content).toContainText('personService');
    await editor.expectHasBreadCrumbs('prebuiltProject-1.0.0-SNAPSHOT.iar', 'config', 'rest-clients.yaml');

    // const editor = new RestClientEditor(wsPage, restClientFileName);
    // await editor.expectTabVisible();
    // await editor.expectTabActive();
    // await editor.expectWebViewVisible();
    // await expect(editor.webViewFrame.getByRole('button', { name: /Add Rest Client/ })).toHaveCount(0);
    // await editor.rows.first().click();
    // const keyInput = editor.detail.getByRole('textbox', { name: 'Key' });
    // await expect(keyInput).toHaveValue('personService');
    // await expect(keyInput).toBeDisabled();
  });
});
