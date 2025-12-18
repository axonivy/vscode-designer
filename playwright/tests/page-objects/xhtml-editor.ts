import { expect, type Locator, type Page } from '@playwright/test';
import { Editor } from './editor';

export class XhtmlEditor extends Editor {
  readonly complitions: Locator;

  constructor(page: Page, editorFile = 'testXhtml.xhtml') {
    super(editorFile, page);
    this.complitions = page.locator('.suggest-widget');
  }

  async expectCompletionAtLineColumn(completion: string, line: number, column: number) {
    await this.executeCommand('Go to Line/Column...', `:${line}:${column}`);
    await this.page.waitForTimeout(300);
    await this.executeCommand('Trigger Suggest');
    await expect(this.complitions.getByText(completion)).toBeVisible();
  }
}
