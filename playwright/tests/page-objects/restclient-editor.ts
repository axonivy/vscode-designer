import { type Locator, type Page, expect } from '@playwright/test';
import { Editor } from './editor';

export class RestClientEditor extends Editor {
  rows: Locator;
  detail: Locator;
  main: Locator;

  constructor(page: Page, editorFile = 'rest-clients.yaml') {
    super(editorFile, page);
    this.rows = this.viewFrameLocator().locator('tbody > tr');
    this.detail = this.viewFrameLocator().locator('#restclient-editor-detail');
    this.main = this.viewFrameLocator().locator('#restclient-editor-main');
  }

  override async isViewVisible() {
    const header = this.main.locator('.ui-toolbar:has-text("Rest Clients")');
    await expect(header).toBeVisible();
  }
}
