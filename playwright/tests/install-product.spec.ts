import { expect, test } from './fixtures/baseTest';
import { FileExplorer } from './page-objects/explorer-view';
import { ProcessEditor } from './page-objects/process-editor';

test.describe('Market Product installation', () => {
  let explorer: FileExplorer;

  test.beforeEach(async ({ page }) => {
    const processEditor = new ProcessEditor(page);
    await processEditor.hasDeployProjectStatusMessage();
    explorer = new FileExplorer(page);
    await explorer.selectNode('processes');
  });

  test('Install product from Market website', async () => {
    await explorer.selectNode('resources');
    await explorer.installProduct('connectivity-demo');
    await explorer.provideUserInput('connectivity-demos');
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNode('connectivity-demos');
    await explorer.selectNode('pom.xml');
  });

  test('Install local product.json', async () => {
    await explorer.selectNode('resources');
    await explorer.selectNode('product.json');
    await explorer.installLocalProduct('resources/product.json');
    await explorer.provideUserInput(); // confirm projects
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNode('connectivity-demos');
    await explorer.selectNode('pom.xml');
  });

  test('Install local product.json with dynamic version', async () => {
    await explorer.selectNode('resources');
    await explorer.selectNode('product-dynamic.json');
    await explorer.installLocalProduct('resources/product-dynamic.json');
    await explorer.provideUserInput('14.0.0-SNAPSHOT');

    const projects = explorer.quickInputList();
    await expect(projects).toBeVisible();
    const entry = projects.locator('div.quick-input-list-entry');
    await expect(entry).toHaveCount(1);
    await expect(entry.getByRole('checkbox')).toHaveAttribute('aria-label', 'connectivity-demos (com.axonivy.demo)');

    await explorer.provideUserInput(); // confirm projects
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNode('connectivity-demos');
    await explorer.selectNode('pom.xml');
  });
});
