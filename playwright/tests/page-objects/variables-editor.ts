import { type Page, expect } from '@playwright/test';
import { Editor } from './editor';

export class VariablesEditor extends Editor {
  constructor(page: Page, editorFile = 'variables.yaml') {
    super(editorFile, page);
  }

  override async isViewVisible() {
    const header = this.viewFrameLocator().locator('.variables-editor-main-toolbar:has-text("Variables")');
    await expect(header).toBeVisible();
  }

  async hasKey(key: string) {
    const field = this.viewFrameLocator().locator('td > div > span');
    await expect(field).toHaveText(key);
    await expect(field).toBeVisible();
  }

  async hasValue(value: string, exact = true) {
    const field = this.viewFrameLocator().locator('td:nth-child(2) > span');
    if (exact) {
      await expect(field).toHaveText(value);
    } else {
      await expect(field).toContainText(value);
    }
    await expect(field).toBeVisible();
  }

  async selectFirstRow() {
    const firstRow = this.viewFrameLocator().locator('tbody > tr');
    await firstRow.first().click();
  }

  async updateValue(value: string) {
    const input = this.viewFrameLocator().getByLabel('Value');
    await input.fill(value);
    await this.hasValue(value);
  }
}
