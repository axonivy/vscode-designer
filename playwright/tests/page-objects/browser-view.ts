import { type FrameLocator, type Locator } from '@playwright/test';
import { webViewFrameLocator } from './webview-util';
import type { WorkspacePage } from './workspace-page';

export class BrowserView {
  readonly webViewFrame: Locator;
  readonly header: Locator;
  readonly content: FrameLocator;

  constructor(
    readonly wsPage: WorkspacePage,
    nthFrame = 0
  ) {
    this.webViewFrame = webViewFrameLocator(this.wsPage, nthFrame);
    this.header = this.webViewFrame.locator('.header');
    this.content = this.webViewFrame.locator('.content').frameLocator('iFrame');
  }

  async openDevWfUi() {
    await this.wsPage.executeCommand('Open Developer Workflow UI');
  }

  async moveToSecondaryPanel() {
    await this.wsPage.executeCommand('View: Move View', 'Browser', 'New Secondary Side Bar Entry');
  }

  get back() {
    return this.header.locator('.back-button');
  }

  get forward() {
    return this.header.locator('.forward-button');
  }

  get reload() {
    return this.header.locator('.reload-button');
  }

  get input() {
    return this.header.locator('.url-input');
  }

  get home() {
    return this.header.locator('.open-home-button');
  }

  get external() {
    return this.header.locator('.open-external-button');
  }
}
