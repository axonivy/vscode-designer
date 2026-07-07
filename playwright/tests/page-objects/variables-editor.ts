import { expect, type Locator } from '@playwright/test';
import { WebViewEditor } from './editor';
import type { WorkspacePage } from './workspace-page';

export class VariablesEditor extends WebViewEditor {
  detail: Locator;
  main: Locator;

  constructor(wsPage: WorkspacePage, fileName = 'variables.yaml') {
    super(wsPage, fileName);
    this.detail = this.webViewFrame.locator('#variable-editor-detail');
    this.main = this.webViewFrame.locator('#variable-editor-main');
  }

  override async expectWebViewVisible() {
    await super.expectWebViewVisible();
    await expect(this.main.locator('.ui-toolbar')).toContainText('Variables');
  }

  async hasKey(key: string) {
    const field = this.webViewFrame.locator('td > div > span');
    await expect(field).toHaveText(key);
    await expect(field).toBeVisible();
  }

  async hasValue(value: string, exact = true) {
    const field = this.webViewFrame.locator('td:nth-child(2) > span');
    if (exact) {
      await expect(field).toHaveText(value);
    } else {
      await expect(field).toContainText(value);
    }
    await expect(field).toBeVisible();
  }

  async selectFirstRow() {
    const firstRow = this.webViewFrame.locator('tbody > tr');
    await firstRow.first().click();
  }

  async updateValue(value: string) {
    const input = this.detail.getByLabel('Value');
    await input.fill(value);
    await this.hasValue(value);
  }
}
