import { expect, test } from '~/fixtures/baseTest';
import { FileExplorer } from '~/page-objects/explorer-view';
import { ProcessEditor } from '~/page-objects/process-editor';

test('Install product without maven-dependency from Market website', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.selectNode('resources');
  await explorer.installProduct('connectivity-demo');
  await wsPage.provideUserInput('14.0.0-SNAPSHOT');
  const header = wsPage.page.locator('div.quick-input-header');
  const checkbox = header.getByRole('checkbox', { name: 'Toggle all checkboxes' });
  await checkbox.check();
  await wsPage.provideUserInput();
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.selectNodeExact('connectivity-demos');
  const processEditor = new ProcessEditor(wsPage, 'personService.p.json');
  await processEditor.open();
});

test('Install product with maven-dependency from Market website', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.selectNode('resources');
  await explorer.installProduct('excel-connector');
  await wsPage.provideUserInput('13.1.2');
  const header = wsPage.page.locator('div.quick-input-header');
  const checkbox = header.getByRole('checkbox', { name: 'Toggle all checkboxes' });
  await checkbox.check();
  await wsPage.provideUserInput();
  await expect(wsPage.quickInputBox).toBeVisible();
  await wsPage.provideUserInput('playwrightTestWorkspace');
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.selectNodeExact('excel-connector-demo');
});

test('Install local product.json', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.selectNode('resources');
  await explorer.selectNode('product.json');
  await explorer.installLocalProduct('product.json');
  await wsPage.provideUserInput(); // confirm projects
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.selectNode('connectivity-demos');
  const processEditor = new ProcessEditor(wsPage, 'personService.p.json');
  await processEditor.open();
});

test('Install local product.json with dynamic version', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.selectNode('resources');
  await explorer.selectNode('product-dynamic.json');
  await explorer.installLocalProduct('product-dynamic.json');
  await wsPage.provideUserInput('14.0.0-SNAPSHOT');

  const projects = wsPage.quickInputList;
  await expect(projects).toBeVisible();
  const entry = projects.locator('div.quick-input-list-entry');
  await expect(entry).toHaveCount(1);
  await expect(entry.getByRole('checkbox')).toHaveAttribute('aria-label', '👁️ connectivity-demos (com.axonivy.demo)');

  await wsPage.provideUserInput(); // confirm projects
  await wsPage.executeCommand('Refresh Explorer');
  await explorer.selectNode('connectivity-demos');
  const processEditor = new ProcessEditor(wsPage, 'personService.p.json');
  await processEditor.open();
});
