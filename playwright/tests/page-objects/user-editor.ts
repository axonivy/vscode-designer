import { type Locator, type Page, expect } from '@playwright/test';
import { Editor } from './editor';

export class UserEditor extends Editor {
  rows: Locator;
  detail: Locator;

  constructor(page: Page, editorFile = 'users.yaml') {
    super(editorFile, page);
    this.rows = this.viewFrameLocator().locator('tbody > tr');
    this.detail = this.viewFrameLocator().locator('.user-editor-detail-panel');
  }

  override async isViewVisible() {
    const header = this.viewFrameLocator().locator('.user-editor-main-toolbar:has-text("Users")');
    await expect(header).toBeVisible();
  }
}
