import { type Locator, type Page, expect } from '@playwright/test';
import { Editor } from './editor';

export class RoleEditor extends Editor {
  rows: Locator;
  detail: Locator;

  constructor(page: Page, editorFile = 'roles.yaml') {
    super(editorFile, page);
    this.rows = this.viewFrameLocator().locator('tbody > tr');
    this.detail = this.viewFrameLocator().locator('.role-editor-detail-panel');
  }

  override async isViewVisible() {
    const header = this.viewFrameLocator().locator('.role-editor-main-toolbar:has-text("Roles")');
    await expect(header).toBeVisible();
  }
}
