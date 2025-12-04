import { type Locator, type Page, expect } from '@playwright/test';

export class PageObject {
  constructor(readonly page: Page) {}

  async executeCommand(command: string, ...userInputs: Array<string>) {
    await expect(this.page.locator('div.command-center')).toBeAttached();
    await expect(async () => {
      await this.page.keyboard.press('F1');
      await this.quickInputBox()
        .locator('input.input')
        .fill('>' + command, { timeout: 100 });
      await this.page.locator(`.quick-input-list-entry:has-text("${command}")`).nth(0).click({ force: true, timeout: 100 });
    }).toPass();
    for (const userInput of userInputs) {
      this.provideUserInput(userInput);
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

  async hasIvyStatusBarIcon() {
    await expect(this.page.locator('div.statusbar-item:has-text("Axon Ivy")')).toBeVisible();
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

  async typeText(text: string, delay = 5) {
    await this.page.keyboard.type(text, { delay });
  }

  quickInputBox(): Locator {
    return this.page.locator('div.quick-input-box');
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
}
