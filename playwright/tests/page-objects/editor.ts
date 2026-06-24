import { type Page, expect } from '@playwright/test';
import { View } from './view';

export class Editor extends View {
  constructor(
    private readonly editorFile: string,
    page: Page,
    frameIndex?: number
  ) {
    super(
      {
        tabSelector: `div.tab:has-text("${editorFile}")`,
        viewSelector: 'body > div > div > div[data-parent-flow-to-element-id] >> visible=true',
        frameIndex
      },
      page
    );
  }

  async openEditorFile() {
    await this.wsPage.openEditorFile(this.editorFile);
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
    await this.page.locator('#status\\.editor\\.selection').click();
    await this.provideUserInput(`:${line}:${column}`);
    await expect(this.page.locator('a.statusbar-item-label').getByText(`Ln ${line}, Col ${column}`)).toBeVisible();
  }
}
