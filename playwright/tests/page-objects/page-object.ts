import { type Page, expect } from '@playwright/test';
import { WorkspacePage } from './workspace-page';

export class PageObject {
  readonly wsPage: WorkspacePage;
  constructor(readonly page: Page) {
    this.wsPage = new WorkspacePage(page);
  }

  async executeCommand(command: string, ...userInputs: Array<string>) {
    await this.wsPage.executeCommand(command, ...userInputs);
  }

  async provideUserInput(input?: string) {
    await this.wsPage.provideUserInput(input);
  }

  async typeText(text: string, delay = 10) {
    await this.page.keyboard.type(text, { delay });
  }

  quickInputBox() {
    return this.wsPage.quickInputBox;
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
