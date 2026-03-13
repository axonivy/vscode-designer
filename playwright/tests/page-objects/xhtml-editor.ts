import { expect, type Locator, type Page } from '@playwright/test';
import { Editor } from './editor';

export class XhtmlEditor extends Editor {
  readonly completions: Locator;
  readonly definitions: Locator;

  constructor(page: Page, editorFile = 'testXhtml.xhtml') {
    super(editorFile, page);
    this.completions = page.locator('.suggest-widget');
    this.definitions = page.locator('.peekview-widget');
  }

  async expectCompletionAtLineColumn(completion: string, line: number, column: number) {
    await this.goToLineColumn(line, column);
    await this.executeCommand('Trigger Suggest');
    await expect(this.completions.getByText(completion)).toBeVisible();
  }

  async expectDefinitionAtLineColumn(definition: string, line: number, column: number) {
    await this.goToLineColumn(line, column);
    await this.executeCommand('Peek Definition');
    await expect(this.definitions.getByText(definition)).toBeVisible();
    this.page.keyboard.press('Escape');
  }
}
