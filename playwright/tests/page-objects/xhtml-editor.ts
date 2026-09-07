import { expect, type Locator } from '@playwright/test';
import { TextEditor } from './editor';
import type { WorkspacePage } from './workspace-page';

export class XhtmlEditor extends TextEditor {
  readonly completions: Locator;
  readonly definitions: Locator;

  constructor(wsPage: WorkspacePage, fileName = 'testXhtml.xhtml') {
    super(wsPage, fileName);
    this.completions = wsPage.page.locator('.suggest-widget');
    this.definitions = wsPage.page.locator('.peekview-widget');
  }

  async expectCompletionAtLineColumn(completion: string, line: number, column: number) {
    await this.goToLineColumn(line, column);
    await this.wsPage.executeCommand('Trigger Suggest');
    await expect(this.completions.getByText(completion)).toBeVisible();
  }

  async expectDefinitionAtLineColumn(definition: string, line: number, column: number) {
    await this.goToLineColumn(line, column);
    await expect(async () => {
      await this.wsPage.executeCommand('Peek Definition');
      await expect(this.definitions.getByText(definition)).toBeVisible({ timeout: 2_000 });
    }).toPass();
  }
}
