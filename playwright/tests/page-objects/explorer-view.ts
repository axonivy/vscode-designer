import { expect, type Locator, type Page } from '@playwright/test';
import { View, type ViewData } from './view';

export abstract class ExplorerView extends View {
  constructor(
    private viewName: string,
    page: Page
  ) {
    const data: ViewData = {
      tabSelector: `div.pane-header:has-text("${viewName}")`,
      viewSelector: ''
    };
    super(data, page);
  }

  override get viewLocator(): Locator {
    return this.page.getByRole('tree', { name: this.viewName });
  }

  async isHidden() {
    await expect(this.tabLocator).toBeHidden();
  }

  async openView() {
    if (!(await this.page.locator(`${this.data.tabSelector}.expanded`).isVisible())) {
      await this.tabLocator.click();
    }
    await expect(this.viewLocator).toBeVisible();
  }

  async closeView() {
    if (await this.page.locator(`${this.data.tabSelector}.expanded`).isVisible()) {
      await this.tabLocator.click();
    }
    await expect(this.viewLocator).toBeHidden();
  }

  async hasNode(name: string) {
    const node = this.viewLocator.getByText(name);
    await expect(node).toBeVisible();
  }

  async hasNoNode(name: string) {
    const node = this.viewLocator.getByText(name);
    await expect(node).not.toBeAttached();
  }

  async selectNode(name: string) {
    await this.viewLocator.getByText(name).click();
    await this.isSelected(name);
  }

  async selectNodeExact(name: string) {
    await this.viewLocator.getByText(name, { exact: true }).click();
    await this.isSelected(name);
  }

  async isSelected(name: string) {
    const selected = this.viewLocator.locator('.monaco-list-row.selected');
    await expect(selected).toContainText(name);
  }

  async doubleClickNode(name: string) {
    await this.viewLocator.getByText(name).dblclick();
  }

  async selectInContextMenuOfNode(name: string, ...menuPath: Array<string>) {
    await this.viewLocator.getByText(name).click({ button: 'right' });
    for (const menuEntry of menuPath.slice(0, -1)) {
      await this.page.getByRole('menuitem', { name: menuEntry }).hover();
    }
    await this.page.getByRole('menuitem', { name: menuPath[menuPath.length - 1] }).click({ delay: 100 });
  }
}

export class FileExplorer extends ExplorerView {
  constructor(page: Page) {
    super('Explorer', page);
  }

  async addFolder(name: string) {
    await this.executeCommand('File: New Folder');
    await this.page.locator('div.explorer-item-edited').getByRole('textbox').fill(name);
    await this.page.keyboard.press('Enter');
  }

  async addNestedProject(rootFolder: string, projectName: string) {
    await this.viewLocator.click();
    await this.addFolder(rootFolder);
    await this.viewLocator.getByText(rootFolder).click({ button: 'right' });
    const menu = this.page.getByRole('menu');
    await menu.getByRole('menuitem', { name: 'Axon Ivy New...' }).hover();
    const newProject = menu.getByRole('menuitem', { name: 'New Project' });
    await expect(newProject).toBeVisible();
    await newProject.click();
    await expect(newProject).toBeHidden();

    await this.provideUserInput(projectName);
    await this.provideUserInput();
    await this.provideUserInput();
  }

  async addProcess(
    processName: string,
    kind: 'Business Process' | 'Callable Sub Process' | 'Web Service Process',
    defaultNamespaceExpected: string = 'prebuiltProject',
    namespace?: string
  ) {
    await this.selectNode('config');
    await this.executeCommand('Axon Ivy: New ' + kind);
    await this.selectNthVisibleItemFromQuickPick(0);
    await this.provideUserInput(processName);
    expect(await this.readInputBoxValue()).toBe(defaultNamespaceExpected);
    await this.provideUserInput(namespace);
  }

  async importBpmnProcess(bpmnXml: string) {
    await this.executeCommand('Axon Ivy: Import BPMN Process');
    await this.selectItemFromQuickPick(bpmnXml);
  }

  async installLocalProduct(productJson: string) {
    await this.executeCommand('Axon Ivy: Install Local Market Product');
    await this.selectItemFromQuickPick(productJson);
  }

  async installProduct(productId: string) {
    await this.executeCommand('Axon Ivy: Install Market Product');
    await this.provideUserInput(productId);
  }

  async addUserDialog(
    dialogName: string,
    namespace: string,
    kind: 'Html Dialog (JSF)' | 'Offline Dialog (JSF)' | 'Dialog Form',
    defaultNamespaceExpected: string = 'prebuiltProject'
  ) {
    await this.selectNode('config');
    await this.executeCommand('Axon Ivy: New ' + kind);
    await this.selectNthVisibleItemFromQuickPick(0);
    await this.provideUserInput(dialogName);
    expect(await this.readInputBoxValue()).toBe(defaultNamespaceExpected);
    await this.provideUserInput(namespace);
    if (kind === 'Html Dialog (JSF)') {
      await this.provideUserInput();
      await this.provideUserInput();
    }
  }

  async addDataClass(dataClass: string, namespace: string, defaultNamespaceExpected: string = 'prebuiltProject') {
    await this.selectNode('config');
    await this.executeCommand('Axon Ivy: New Data Class');
    await this.selectNthVisibleItemFromQuickPick(0);
    await this.provideUserInput(dataClass);
    expect(await this.readInputBoxValue()).toBe(defaultNamespaceExpected);
    await this.provideUserInput(namespace);
  }

  async addEntityClass(entityClass: string, namespace: string, defaultNamespaceExpected: string = 'prebuiltProject') {
    await this.selectNode('config');
    await this.executeCommand('Axon Ivy: New Entity Class');
    await this.selectNthVisibleItemFromQuickPick(0);
    await this.provideUserInput(entityClass);
    expect(await this.readInputBoxValue()).toBe(defaultNamespaceExpected);
    await this.provideUserInput(namespace);
  }
}

export class ProjectExplorerView extends ExplorerView {
  constructor(page: Page) {
    super('Axon Ivy Projects', page);
  }
}
