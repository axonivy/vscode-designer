import { expect, type Locator } from '@playwright/test';
import { TextEditor } from './editor';
import type { WorkspacePage } from './workspace-page';

export class XhtmlEditor extends TextEditor {
  readonly completions: Locator;
  readonly main: Locator;
  readonly definitions: Locator;

  constructor(wsPage: WorkspacePage, fileName = 'testXhtml.xhtml') {
    super(wsPage, fileName);
    this.main = wsPage.page.locator('#canvas');
    this.completions = wsPage.page.locator('.suggest-widget');
    this.definitions = wsPage.page.locator('.peekview-widget');
  }

  get toolbar() {
    return this.main.locator('.toolbar');
  }

  async expectCompletionAtLineColumn(completion: string, line: number, column: number) {
    await this.goToLineColumn(line, column);
    await this.wsPage.executeCommand('Trigger Suggest');
    await expect(this.completions.getByText(completion)).toBeVisible();
  }

  async expectDefinitionAtLineColumn(definition: string, line: number, column: number) {
    await this.goToLineColumn(line, column);
    await this.wsPage.executeCommand('Peek Definition');
    await expect(this.definitions.getByText(definition)).toBeVisible();
    await this.wsPage.page.keyboard.press('Escape');
  }
}
