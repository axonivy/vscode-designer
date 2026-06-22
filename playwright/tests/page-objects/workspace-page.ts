import { type Page, expect } from '@playwright/test';

export class WorkspacePage {
  constructor(readonly page: Page) {}

  async openEditorFile(fileName: string) {
    await this.page.keyboard.press('ControlOrMeta+KeyP');
    await this.quickInputBox.locator('input.input').fill(fileName);
    await this.page.locator('span.monaco-icon-name-container').getByText(fileName).first().click();
  }

  async executeCommand(command: string, ...userInputs: Array<string>) {
    await expect(this.page.locator('div.command-center')).toBeAttached();
    await expect(async () => {
      await this.page.keyboard.press('ControlOrMeta+Shift+KeyP');
      await this.quickInputBox.locator('input.input').fill('>' + command, { timeout: 300 });
    }).toPass();
    await this.quickInputListEntry.getByText(command).first().click({ delay: 100 });
    for (const userInput of userInputs) {
      await this.provideUserInput(userInput);
    }
  }

  async provideUserInput(input?: string) {
    if (input) {
      const textBox = this.quickInputBox.getByRole('textbox');
      await textBox.fill(input);
      await expect(textBox).toHaveValue(input);
      await textBox.press('Enter', { delay: 100 });
      return;
    }
    await this.quickInputBox.click({ delay: 100 });
    await this.quickInputBox.press('Enter', { delay: 100 });
  }

  get quickInputBox() {
    return this.page.locator('div.quick-input-box');
  }

  get toasts() {
    return this.page.locator('div.notification-toast-container');
  }

  get ivyStatusBar() {
    return this.page.locator('div.statusbar-item[id*="ivyStatusBarItem"]');
  }

  get quickInputListEntry() {
    return this.page.locator('div.quick-input-list-entry');
  }

  async activateExpensiveJavaStandardMode() {
    const javaStatusBar = this.page.locator('div.statusbar-item[id*="redhat.java"]');
    await javaStatusBar.filter({ hasText: 'Java: Lightweight Mode' }).click();
    await expect(javaStatusBar.filter({ hasText: 'Java: Building' })).toBeVisible();
    await expect(javaStatusBar.filter({ hasText: 'Java: Ready' })).toBeVisible();
  }

  async hasReadyStatusMessage() {
    await this.hasStatusMessage('Axon Ivy: Connected');
  }

  async hasStatusMessage(message: string, timeout?: number) {
    await expect(this.ivyStatusBar).toHaveText(message, { timeout });
  }
}
