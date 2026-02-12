import { expect, test } from './fixtures/baseTest';
import { FileExplorer } from './page-objects/explorer-view';
import { ProcessEditor } from './page-objects/process-editor';

test.describe('Market Product installation', () => {
  let explorer: FileExplorer;
  let processEditor: ProcessEditor;

  test.beforeEach(async ({ page }) => {
    explorer = new FileExplorer(page);
    processEditor = new ProcessEditor(page, 'personService.p.json');
    await explorer.hasDeployProjectStatusMessage();
  });

  test('Install product from Market website', async () => {
    await explorer.selectNode('resources');
    await explorer.installProduct('connectivity-demo');
    await explorer.provideUserInput('14.0.0-SNAPSHOT');
    await explorer.provideUserInput('connectivity-demos$');
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNodeExact('connectivity-demos');
    await processEditor.openEditorFile();
  });

  test('Install local product.json', async () => {
    await explorer.selectNode('resources');
    await explorer.selectNode('product.json');
    await explorer.installLocalProduct('product.json');
    await explorer.provideUserInput(); // confirm projects
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNode('connectivity-demos');
    await processEditor.openEditorFile();
  });

  test('Install local product.json with dynamic version', async () => {
    await explorer.selectNode('resources');
    await explorer.selectNode('product-dynamic.json');
    await explorer.installLocalProduct('product-dynamic.json');
    await explorer.provideUserInput('14.0.0-SNAPSHOT');

    const projects = explorer.quickInputList();
    await expect(projects).toBeVisible();
    const entry = projects.locator('div.quick-input-list-entry');
    await expect(entry).toHaveCount(1);
    await expect(entry.getByRole('checkbox')).toHaveAttribute('aria-label', 'connectivity-demos (com.axonivy.demo)');

    await explorer.provideUserInput(); // confirm projects
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNode('connectivity-demos');
    await processEditor.openEditorFile();
  });
});
