import { expect, type Locator } from '@playwright/test';
import type { WorkspacePage } from './workspace-page';

export class TextEditor {
  tab: Locator;
  content: Locator;

  constructor(
    readonly wsPage: WorkspacePage,
    readonly fileName: string
  ) {
    this.tab = this.wsPage.page.locator(`div.tab:has-text("${fileName}")`);
    this.content = this.wsPage.page.locator('div.editor-container');
  }

  async open() {
    await this.openEditor();
  }

  async openEditor() {
    await this.wsPage.openEditorFile(this.fileName);
    await this.isTabVisible();
  }

  async isTabVisible() {
    await expect(this.tab).toBeVisible();
  }
}
