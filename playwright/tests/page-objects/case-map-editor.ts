import { type Locator, expect } from '@playwright/test';
import { WebViewEditor } from './webview-editor';
import type { WorkspacePage } from './workspace-page';

export class CaseMapEditor extends WebViewEditor {
  main: Locator;
  stages: Locator;
  detail: Locator;
  helpButton: Locator;

  constructor(wsPage: WorkspacePage, fileName = 'CaseMap.m.json') {
    super(wsPage, fileName);
    this.main = this.webViewFrame.locator('#case-map-editor-main');
    this.stages = this.main.locator('[data-element-type="stage"]');
    this.detail = this.webViewFrame.locator('#case-map-editor-detail');
    this.helpButton = this.detail.getByRole('button', { name: 'Open Help' });
  }

  override async expectWebViewVisible() {
    await super.expectWebViewVisible();
    await expect(this.main.locator('.ui-toolbar')).toContainText('Case Map');
  }
}
