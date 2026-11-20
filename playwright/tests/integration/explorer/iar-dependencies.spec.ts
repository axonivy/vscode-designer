import path from 'path';
import { expect, test } from '~/fixtures/baseTest';
import { ProjectExplorerView } from '~/page-objects/explorer-view';
import { ProcessEditor } from '~/page-objects/process-editor';
import { RestClientEditor } from '~/page-objects/restclient-editor';
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

  test('opens an IAR file in the rest client editor and keeps it read-only', async ({ wsPage, tmpWorkspace }) => {
    const restClientFileName = 'rest-clients.yaml';

    const projectName = path.basename(tmpWorkspace!.tmpWorkspacePath);
    const projectExplorer = new ProjectExplorerView(wsPage);
    await projectExplorer.openView();
    await projectExplorer.hasNodeExactCollapsible(projectName);
    await projectExplorer.expandNodeExact(projectName);
    await projectExplorer.expandNodeExact('IAR Dependencies');
    await projectExplorer.expandNodeExact(projectExplorerItem);
    await projectExplorer.expandNodeExact('config');
    await projectExplorer.scrollToNodeExact(restClientFileName);
    await projectExplorer.selectNodeExact(restClientFileName);

    const editor = new RestClientEditor(wsPage);
    await editor.expectTabVisible();
    await editor.expectTabActive();
    await editor.expectWebViewVisible();
    await expect(editor.webViewFrame.getByRole('button', { name: /Add Rest Client/ })).toHaveCount(0);
    await editor.rows.first().click();
    const keyInput = editor.detail.getByRole('textbox', { name: 'Key' });
    await expect(keyInput).toHaveValue('personService');
    await expect(keyInput).toBeDisabled();
  });

  test('opens an IAR file in the process editor and keeps it read-only', async ({ wsPage, tmpWorkspace }) => {
    // Currently IAR open process is broken on Windows, so we skip the test there
    test.skip(process.platform === 'win32');

    const projectName = path.basename(tmpWorkspace!.tmpWorkspacePath);
    const projectExplorer = new ProjectExplorerView(wsPage);
    await projectExplorer.openView();
    await projectExplorer.hasNodeExactCollapsible(projectName);
    await projectExplorer.expandNodeExact(projectName);
    await projectExplorer.expandNodeExact('IAR Dependencies');
    await projectExplorer.expandNodeExact(projectExplorerItem);
    await projectExplorer.scrollToNodeExact('process');
    await projectExplorer.expandNodeExact('process');
    await projectExplorer.scrollToNodeExact('ProcurementRequestUserTask.p.json');
    await projectExplorer.selectNodeExact('ProcurementRequestUserTask.p.json');

    const editor = new ProcessEditor(wsPage);
    await editor.open();
    const startEvent = editor.elementByType('start:requestStart');
    await startEvent.locator('circle').click({ force: true });
    await editor.assertSelected(startEvent);
    await expect(editor.quickActionBar.getByRole('button', { name: /Edit Label/ })).toHaveCount(0);
  });
});
