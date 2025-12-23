import { expect, test } from './fixtures/baseTest';
import { FileExplorer } from './page-objects/explorer-view';
import { ProcessEditor } from './page-objects/process-editor';

test.describe('Market Product installation', () => {
  test('Install product.json', async ({ page }) => {
    const processEditor = new ProcessEditor(page);
    await processEditor.hasDeployProjectStatusMessage();
    const explorer = new FileExplorer(page);
    await explorer.selectNode('processes');

    await explorer.selectNode('resources');
    await explorer.selectNode('product.json');
    await expect(processEditor.editorContent()).toContainText('connectivity-demos');
    await explorer.installProduct('resources/product.json');
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNode('connectivity-demos');
    await explorer.selectNode('pom.xml');
  });

  test('Install product.json with dynamic version', async ({ page }) => {
    const processEditor = new ProcessEditor(page);
    await processEditor.hasDeployProjectStatusMessage();
    const explorer = new FileExplorer(page);
    await explorer.selectNode('processes');

    await explorer.selectNode('resources');
    await explorer.selectNode('product-dynamic.json');
    await expect(processEditor.editorContent()).toContainText('connectivity-demos');
    await explorer.installProduct('resources/product-dynamic.json');
    await explorer.provideUserInput('14.0.0-SNAPSHOT');
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNode('connectivity-demos');
    await explorer.selectNode('pom.xml');
  });
});
