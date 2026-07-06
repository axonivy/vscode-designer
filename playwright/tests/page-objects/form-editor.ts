import { expect, type Locator } from '@playwright/test';
import { WebViewEditor } from './editor';
import type { WorkspacePage } from './workspace-page';

export class FormEditor extends WebViewEditor {
  main: Locator;
  detail: Locator;

  constructor(wsPage: WorkspacePage, fileName = 'testForm.f.json', nthFrame = 0) {
    super(wsPage, fileName, nthFrame);
    this.main = this.webViewFrame.locator('#canvas');
    this.detail = this.webViewFrame.locator('#properties');
  }

  override async expectWebViewVisible() {
    await super.expectWebViewVisible();
    await expect(this.main).toBeVisible();
  }

  blockFor(type: 'text' | 'input' | 'composite') {
    return this.main.locator(`.block-${type}`);
  }

  get toolbar() {
    return this.main.locator('.toolbar');
  }

  get quickBar() {
    return this.webViewFrame.locator('.quickbar');
  }

  get quickBarMenu() {
    return this.webViewFrame.locator('.quickbar-menu');
  }
}
