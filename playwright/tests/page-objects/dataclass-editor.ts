import { expect, type Locator } from '@playwright/test';
import { WebViewEditor } from './editor';
import type { WorkspacePage } from './workspace-page';

export class DataClassEditor extends WebViewEditor {
  main: Locator;

  constructor(wsPage: WorkspacePage, fileName = 'DataClassEditorTest.d.json', nthFrame = 0) {
    super(wsPage, fileName, nthFrame);
    this.main = this.webViewFrame.locator('#dataclass-editor-main');
  }

  override async expectWebViewVisible() {
    await super.expectWebViewVisible();
    await expect(this.toolbar).toContainText('Data Class -');
  }

  async expectEntityViewVisible() {
    await super.expectWebViewVisible();
    await expect(this.toolbar).toContainText('Entity Class -');
  }

  get toolbar() {
    return this.main.locator('.ui-toolbar');
  }
}
