import { type Locator, type Page, expect } from '@playwright/test';
import { Editor } from './editor';

export class PersistenceEditor extends Editor {
  rows: Locator;
  detail: Locator;

  constructor(page: Page, editorFile = 'persistence.xml') {
    super(editorFile, page);
    this.rows = this.viewFrameLocator().locator('tbody > tr');
    this.detail = this.viewFrameLocator().locator('.persistence-editor-detail-panel');
  }

  override async isViewVisible() {
    const header = this.viewFrameLocator().locator('.persistence-editor-main-toolbar:has-text("Persistence Units")');
    await expect(header).toBeVisible();
  }
}
