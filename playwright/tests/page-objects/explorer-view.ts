import { expect, type Locator } from '@playwright/test';
import type { WorkspacePage } from './workspace-page';

abstract class ExplorerView {
  readonly tab: Locator;
  private readonly expandedTab: Locator;
  readonly view: Locator;

  constructor(
    readonly wsPage: WorkspacePage,
    private viewName: string
  ) {
    this.tab = wsPage.page.locator(`div.pane-header:has-text("${viewName}")`);
    this.expandedTab = wsPage.page.locator(`div.pane-header:has-text("${viewName}").expanded`);
    this.view = wsPage.page.getByRole('tree', { name: this.viewName });
  }

  async isHidden() {
    await expect(this.tab).toBeHidden();
  }

  async openView() {
    if (!(await this.expandedTab.isVisible())) {
      await this.tab.click();
    }
    await expect(this.view).toBeVisible();
  }

  async closeView() {
    if (await this.expandedTab.isVisible()) {
      await this.tab.click();
    }
    await expect(this.view).toBeHidden();
  }

  async hasNode(name: string) {
    const node = this.view.getByText(name);
    await expect(node).toBeVisible();
  }

  async hasNodeExact(name: string) {
    const node = this.view.getByText(name, { exact: true });
    await expect(node).toBeVisible();
  }

  async hasNoNode(name: string) {
    const node = this.view.getByText(name);
    await expect(node).not.toBeAttached();
  }

  async selectNode(name: string) {
    await this.view.getByText(name).click();
    await this.isSelected(name);
  }

  async selectNodeExact(name: string) {
    await this.view.getByText(name, { exact: true }).click();
    await this.isSelected(name);
  }

  async isSelected(name: string) {
    const selected = this.view.locator('.monaco-list-row.selected');
    await expect(selected).toContainText(name);
  }

  async doubleClickNode(name: string) {
    await this.view.getByText(name).dblclick();
  }

  async selectInContextMenuOfNode(name: string, ...menuPath: Array<string>) {
    await this.view.getByText(name).click({ button: 'right' });
    for (const menuEntry of menuPath.slice(0, -1)) {
      await this.wsPage.page.getByRole('menuitem', { name: menuEntry }).hover();
    }
    await this.wsPage.page.getByRole('menuitem', { name: menuPath[menuPath.length - 1] }).click({ delay: 100 });
  }
}

export class FileExplorer extends ExplorerView {
  constructor(wsPage: WorkspacePage) {
    super(wsPage, 'Explorer');
  }

  async addFolder(name: string) {
    await this.wsPage.executeCommand('File: New Folder');
    await this.wsPage.page.locator('div.explorer-item-edited').getByRole('textbox').fill(name);
    await this.wsPage.page.keyboard.press('Enter');
  }

  async addNestedProject(rootFolder: string, projectName: string) {
    await this.addFolder(rootFolder);
    await this.view.getByText(rootFolder).click({ button: 'right' });
    const menu = this.wsPage.page.getByRole('menu');
    await menu.getByRole('menuitem', { name: 'Axon Ivy New...' }).hover();
    const newProject = menu.getByRole('menuitem', { name: 'New Project' });
    await newProject.click({ delay: 100 });

    await this.wsPage.provideUserInput(projectName);
    await this.wsPage.provideUserInput();
    await this.wsPage.provideUserInput();
  }

  async addProcess(
    processName: string,
    kind: 'Business Process' | 'Callable Sub Process' | 'Web Service Process',
    namespace?: string,
    defaultNamespaceExpected?: string
  ) {
    if (defaultNamespaceExpected === undefined) {
      defaultNamespaceExpected = 'prebuiltProject';
    }
    await this.selectNode('config');
    await this.wsPage.executeCommand('Axon Ivy: New ' + kind);
    await this.wsPage.provideUserInput('playwrightTestWorkspace');
    await this.wsPage.provideUserInput(processName);
    await expect(this.wsPage.quickInputBox.getByRole('textbox')).toHaveValue(defaultNamespaceExpected);
    await this.wsPage.provideUserInput(namespace);
  }

  async installLocalProduct(productJson: string) {
    await this.wsPage.executeCommand('Axon Ivy: Install Local Market Product');
    await this.wsPage.selectItemFromQuickPick(productJson);
  }

  async installProduct(productId: string) {
    await this.wsPage.executeCommand('Axon Ivy: Install Market Product');
    await this.wsPage.provideUserInput(productId);
  }

  async addUserDialog(
    dialogName: string,
    namespace: string,
    kind: 'Html Dialog (JSF)' | 'Offline Dialog (JSF)' | 'Dialog Form',
    defaultNamespaceExpected: string = 'prebuiltProject'
  ) {
    await this.selectNode('config');
    await this.wsPage.executeCommand('Axon Ivy: New ' + kind);
    await this.wsPage.provideUserInput('playwrightTestWorkspace');
    await this.wsPage.provideUserInput(dialogName);
    await expect(this.wsPage.quickInputBox.getByRole('textbox')).toHaveValue(defaultNamespaceExpected);
    await this.wsPage.provideUserInput(namespace);
    if (kind === 'Html Dialog (JSF)') {
      await this.wsPage.provideUserInput();
      await this.wsPage.provideUserInput();
    }
  }

  async addDataClass(dataClass: string, namespace: string, defaultNamespaceExpected: string = 'prebuiltProject') {
    await this.selectNode('config');
    await this.wsPage.executeCommand('Axon Ivy: New Data Class');
    await this.wsPage.provideUserInput('playwrightTestWorkspace');
    await this.wsPage.provideUserInput(dataClass);
    await expect(this.wsPage.quickInputBox.getByRole('textbox')).toHaveValue(defaultNamespaceExpected);
    await this.wsPage.provideUserInput(namespace);
  }

  async addEntityClass(entityClass: string, namespace: string, defaultNamespaceExpected: string = 'prebuiltProject') {
    await this.selectNode('config');
    await this.wsPage.executeCommand('Axon Ivy: New Entity Class');
    await this.wsPage.provideUserInput('playwrightTestWorkspace');
    await this.wsPage.provideUserInput(entityClass);
    await expect(this.wsPage.quickInputBox.getByRole('textbox')).toHaveValue(defaultNamespaceExpected);
    await this.wsPage.provideUserInput(namespace);
  }
}

export class ProjectExplorerView extends ExplorerView {
  constructor(wsPage: WorkspacePage) {
    super(wsPage, 'Axon Ivy Projects');
  }
}
