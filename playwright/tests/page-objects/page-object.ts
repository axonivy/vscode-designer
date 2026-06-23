import { type Locator, type Page, expect } from '@playwright/test';

export class PageObject {
  constructor(readonly page: Page) {}

  async executeCommand(command: string, ...userInputs: Array<string>) {
    await expect(this.page.locator('div.command-center')).toBeAttached();
    await expect(async () => {
      await this.page.keyboard.press('ControlOrMeta+Shift+KeyP');
      await this.quickInputBox()
        .locator('input.input')
        .fill('>' + command, { timeout: 300 });
    }).toPass();
    await this.quickInputList().getByRole('option', { name: command }).click({ force: true, delay: 200 });
    for (const userInput of userInputs) {
      await this.provideUserInput(userInput);
    }
  }

  async provideUserInput(input?: string) {
    if (input) {
      const textBox = this.quickInputBox().getByRole('textbox');
      await textBox.fill(input);
      await expect(textBox).toHaveValue(input);
      await textBox.press('Enter', { delay: 100 });
      return;
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

  quickInputListEntry() {
    return this.page.locator('.quick-input-list-entry');
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

  async selectItemFromQuickPick(label: string) {
    const item = this.page.locator('div.quick-input-list').locator('div.monaco-icon-label-container', { hasText: label });
    await item.click({ delay: 100 });
    await expect(item).toBeHidden();
  }
}
