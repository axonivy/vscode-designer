import { expect, test } from '../fixtures/baseTest';
import { FileExplorer } from '../page-objects/explorer-view';
import { ProcessEditor } from '../page-objects/process-editor';

// eslint-disable-next-line playwright/no-skipped-test
test.describe.skip('Market Product installation', () => {
  let explorer: FileExplorer;
  let processEditor: ProcessEditor;

  test.beforeEach(async ({ page }) => {
    explorer = new FileExplorer(page);
    processEditor = new ProcessEditor(page, 'personService.p.json');
    await explorer.hasReadyStatusMessage();
  });

  test('Install product without maven-dependency from Market website', async () => {
    await explorer.selectNode('resources');
    await explorer.installProduct('connectivity-demo');
    await explorer.provideUserInput('14.0.0-SNAPSHOT');
    const header = explorer.page.locator('div.quick-input-header');
    const checkbox = header.getByRole('checkbox', { name: 'Toggle all checkboxes' });
    await expect(checkbox).toBeVisible();
    const ariaChecked = await checkbox.getAttribute('aria-checked');
    if (ariaChecked == 'false') {
      await checkbox.click();
    }
    await expect(checkbox).toHaveAttribute('aria-checked', 'true');
    await explorer.provideUserInput();
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNodeExact('connectivity-demos');
    await processEditor.openEditorFile();
  });

  test('Install product with maven-dependency from Market website', async () => {
    await explorer.selectNode('resources');
    await explorer.installProduct('excel-connector');
    await explorer.provideUserInput('13.1.2');
    const header = explorer.page.locator('div.quick-input-header');
    const checkbox = header.getByRole('checkbox', { name: 'Toggle all checkboxes' });
    await expect(checkbox).toBeVisible();
    const ariaChecked = await checkbox.getAttribute('aria-checked');
    if (ariaChecked == 'false') {
      await checkbox.click();
    }
    await expect(checkbox).toHaveAttribute('aria-checked', 'true');
    await explorer.provideUserInput();
    await expect(explorer.quickInputBox()).toBeVisible();
    await explorer.provideUserInput('playwrightTestWorkspace');
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNodeExact('excel-connector-demo');
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
    await expect(entry.getByRole('checkbox')).toHaveAttribute('aria-label', '👁️ connectivity-demos (com.axonivy.demo)');

    await explorer.provideUserInput(); // confirm projects
    await explorer.executeCommand('Refresh Explorer');
    await explorer.selectNode('connectivity-demos');
    await processEditor.openEditorFile();
  });
});
