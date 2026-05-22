import { type Locator, expect } from '@playwright/test';
import { WebViewEditor } from './webview-editor';
import type { WorkspacePage } from './workspace-page';

export class WebServiceClientEditor extends WebViewEditor {
  rows: Locator;
  detail: Locator;
  main: Locator;

  constructor(wsPage: WorkspacePage, fileName = 'webservice-clients.yaml') {
    super(wsPage, fileName);
    this.rows = this.webViewFrame.locator('tbody > tr');
    this.detail = this.webViewFrame.locator('#webservice-editor-detail');
    this.main = this.webViewFrame.locator('#webservice-editor-main');
  }

  override async expectWebViewVisible() {
    await super.expectWebViewVisible();
    await expect(this.main.locator('.ui-toolbar')).toContainText('Web Services');
  }
}
