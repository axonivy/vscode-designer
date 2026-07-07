import { type Locator, expect } from '@playwright/test';
import { WebViewEditor } from './editor';
import type { WorkspacePage } from './workspace-page';

export class RestClientEditor extends WebViewEditor {
  rows: Locator;
  detail: Locator;
  main: Locator;

  constructor(wsPage: WorkspacePage, fileName = 'rest-clients.yaml') {
    super(wsPage, fileName);
    this.rows = this.webViewFrame.locator('tbody > tr');
    this.detail = this.webViewFrame.locator('#restclient-editor-detail');
    this.main = this.webViewFrame.locator('#restclient-editor-main');
  }

  override async expectWebViewVisible() {
    await super.expectWebViewVisible();
    await expect(this.main.locator('.ui-toolbar')).toContainText('Rest Clients');
  }
}
