import { expect, Locator, Page } from '@playwright/test';
import path from 'path';
import { View, ViewData } from './view';

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

  async isSelected(name: string) {
    const selected = this.viewLocator.locator('.monaco-list-row.selected');
    await expect(selected).toContainText(name);
  }

  async doubleClickNode(name: string) {
    await this.viewLocator.getByText(name).dblclick();
  }
}

export class FileExplorer extends ExplorerView {
  constructor(page: Page) {
    super('Explorer', page);
  }

  async addFolder(name: string) {
    await this.executeCommand('File: New Folder');
    await this.typeText(name);
    await this.page.keyboard.press('Enter');
  }

  async addNestedProject(rootFolder: string, projectName: string) {
    await this.viewLocator.click();
    await this.addFolder(rootFolder);
    await this.selectNode(rootFolder);
    await this.executeCommand('Axon Ivy: New Project');
    await this.provideUserInput(projectName);
    await this.provideUserInput();
    await this.provideUserInput();
    await this.provideUserInput();
    await this.hasNode(rootFolder + path.sep + projectName);
  }

  async addProcess(processName: string, kind: 'Business Process' | 'Callable Sub Process' | 'Web Service Process') {
    await this.selectNode('config');
    await this.executeCommand('Axon Ivy: New ' + kind);
    await this.provideUserInput(processName);
  }

  async addUserDialog(dialogName: string, namespace: string, kind: 'Html Dialog' | 'Offline Dialog' | 'Form Dialog') {
    await this.selectNode('config');
    await this.executeCommand('Axon Ivy: New ' + kind);
    await this.provideUserInput(dialogName);
    await this.provideUserInput(namespace);
    if (kind === 'Html Dialog') {
      await this.provideUserInput();
      await this.provideUserInput();
    }
  }

  async addDataClass(dataClass: string, namespace: string) {
    await this.selectNode('config');
    await this.executeCommand('Axon Ivy: New Data Class');
    await this.provideUserInput(dataClass);
    await this.provideUserInput(namespace);
  }
}

export class ProjectExplorerView extends ExplorerView {
  constructor(page: Page) {
    super('Axon Ivy Projects', page);
  }

  async revealInExplorer(name: string) {
    await this.selectNode(name);
    await this.executeCommand('Axon Ivy: Reveal in Explorer');
  }
}
