import { type Locator, type Page, expect } from '@playwright/test';
import { getCtrlOrMeta } from '../utils/keyboard';

export class PageObject {
  constructor(readonly page: Page) {}

  async executeCommand(command: string, ...userInputs: Array<string>) {
    await expect(this.page.locator('div.command-center')).toBeAttached();
    await expect(async () => {
      this.page.keyboard.press(`${getCtrlOrMeta()}+Shift+KeyP`);
      await this.quickInputBox()
        .locator('input.input')
        .fill('>' + command, { timeout: 100 });
      await this.page.locator(`.quick-input-list-entry:has-text("${command}")`).nth(0).click({ force: true, timeout: 100 });
    }).toPass();
    for (const userInput of userInputs) {
      await this.provideUserInput(userInput);
    }
  }

  async isExplorerActionItemChecked() {
    await this.isActionItemChecked('Explorer');
  }

  async isActionItemChecked(label: string) {
    await expect(this.page.locator('li.action-item.checked').getByLabel(label).first()).toBeVisible();
  }

  async hasStatusMessage(message: string, timeout?: number) {
    await expect(this.page.locator('#status\\.extensionMessage')).toHaveText(message, { timeout });
  }

  async hasDeployProjectStatusMessage(timeout?: number) {
    await this.hasStatusMessage('Finished: Deploy Ivy Projects', timeout);
  }

  async hasNoStatusMessage() {
    await expect(this.page.locator('#status\\.extensionMessage')).toBeHidden();
  }

  async provideUserInput(input?: string) {
    if (input) {
      const textBox = this.quickInputBox().getByRole('textbox');
      await textBox.fill(input);
      await expect(textBox).toHaveValue(input);
    }
    await this.quickInputBox().click({ delay: 100 });
    await this.quickInputBox().press('Enter', { delay: 100 });
  }

  async closeAllTabs() {
    await this.executeCommand('View: Close All Editor Groups');
    await expect(this.page.locator('div.tab')).toBeHidden();
  }

  async isTabWithNameVisible(name: string) {
    const tabSelector = `div.tab:has-text("${name}")`;
    await expect(this.page.locator(tabSelector)).toBeVisible();
  }

  async typeText(text: string, delay = 10) {
    await this.page.keyboard.type(text, { delay });
  }

  quickInputBox(): Locator {
    return this.page.locator('div.quick-input-box');
  }

  quickInputList(): Locator {
    return this.page.locator('div.quick-input-list');
  }

  async saveAllFiles() {
    const dirtyLocator = this.page.locator('div.dirty');
    if (await dirtyLocator.isHidden()) {
      return;
    }
    await expect(async () => {
      if (await dirtyLocator.isVisible()) {
        await this.executeCommand('File: Save All Files');
      }
      await expect(dirtyLocator).toBeHidden();
    }).toPass();
  }

  async activateExpensiveJavaStandardMode() {
    const statusBarItem = (text: string) => this.page.locator(`div.statusbar-item:has-text("${text}")`);
    await statusBarItem('Java: Lightweight Mode').click();
    await expect(statusBarItem('Java: Importing Maven')).toBeVisible();
    await expect(statusBarItem('Java: Ready')).toBeVisible();
    await expect(statusBarItem('Finished: Invalidate class loader')).toBeVisible();
  }

  async selectItemFromQuickPick(label: string) {
    const item = this.page.locator('div.quick-input-list').locator('div.monaco-icon-label-container', { hasText: label });
    await item.click();
    await expect(item).toBeHidden();
  }
}
