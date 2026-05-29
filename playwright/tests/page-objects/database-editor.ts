import { expect, type Locator } from '@playwright/test';
import { WebViewEditor } from './webview-editor';
import { WorkspacePage } from './workspace-page';

export class DatabaseEditor extends WebViewEditor {
  readonly rows: Locator;
  readonly detail: Locator;
  readonly main: Locator;

  constructor(wsPage: WorkspacePage, fileName = 'databases.yaml') {
    super(wsPage, fileName);
    this.rows = this.webViewFrame.locator('tbody > tr');
    this.detail = this.webViewFrame.locator('#database-editor-detail');
    this.main = this.webViewFrame.locator('#database-editor-main');
  }

  override async expectWebViewVisible() {
    await super.expectWebViewVisible();
    await expect(this.main.locator('.ui-toolbar')).toContainText('Database Editor');
  }
}
