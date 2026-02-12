import { type Page, expect } from '@playwright/test';
import { View } from './view';

export class Editor extends View {
  constructor(
    private readonly editorFile: string,
    page: Page
  ) {
    const viewData = {
      tabSelector: `div.tab:has-text("${editorFile}")`,
      viewSelector: 'body > div > div[data-parent-flow-to-element-id] >> visible=true'
    };
    super(viewData, page);
  }

  async openEditorFile() {
    await this.commandCenter().click();
    await this.quickInputBox().locator('input.input').fill(this.editorFile);
    await this.page.locator('span.monaco-icon-name-container').getByText(this.editorFile).first().click();
  }

  async revertAndCloseEditor() {
    if (await this.tabLocator.isVisible()) {
      await this.tabLocator.click({ delay: 500 });
      await this.executeCommand('View: Revert and Close Editor');
    }
    await expect(this.tabLocator).toBeHidden();
  }

  editorContent() {
    return this.page.locator('div.editor-container');
  }

  async goToLineColumn(line: number, column: number) {
    await this.executeCommand('Go to Line/Column...', `:${line}:${column}`);
    await expect(this.page.locator('a.statusbar-item-label').getByText(`Ln ${line}, Col ${column}`)).toBeVisible();
  }
}
