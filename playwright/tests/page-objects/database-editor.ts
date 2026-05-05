import { expect, type Locator, type Page } from '@playwright/test';
import { Editor } from './editor';

export class DatabaseEditor extends Editor {
  readonly rows: Locator;
  readonly detail: Locator;

  constructor(page: Page, editorFile = 'databases.yaml') {
    super(editorFile, page);
    this.rows = this.viewFrameLocator().locator('tbody > tr');
    this.detail = this.viewFrameLocator().locator('#database-editor-detail');
  }

  override async isViewVisible() {
    const header = this.viewFrameLocator().locator('#database-editor-main .ui-toolbar:has-text("Database Editor")');
    await expect(header).toBeVisible();
  }
}
