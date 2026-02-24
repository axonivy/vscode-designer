import { type Locator, type Page, expect } from '@playwright/test';
import { Editor } from './editor';

export class WebServiceClientEditor extends Editor {
  rows: Locator;
  detail: Locator;

  constructor(page: Page, editorFile = 'webservice-clients.yaml') {
    super(editorFile, page);
    this.rows = this.viewFrameLocator().locator('tbody > tr');
    this.detail = this.viewFrameLocator().locator('.webservice-editor-detail-content');
  }

  override async isViewVisible() {
    await expect(this.viewFrameLocator().locator('.webservice-editor-main-panel')).toContainText('Web Services');
  }
}
