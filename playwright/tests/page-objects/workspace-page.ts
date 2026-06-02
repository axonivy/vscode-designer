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
      await this.quickInputBox.locator('input.input').fill('>' + command, { timeout: 100 });
      await this.page.locator(`.quick-input-list-entry:has-text("${command}")`).nth(0).click({ force: true, timeout: 100 });
    }).toPass();
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

  async activateExpensiveJavaStandardMode() {
    const statusBarItem = (text: string) => this.page.locator(`div.statusbar-item:has-text("${text}")`);
    await statusBarItem('Java: Lightweight Mode').click();
    await expect(statusBarItem('Java: Building')).toBeVisible();
    await expect(statusBarItem('Java: Ready')).toBeVisible();
  }
}
