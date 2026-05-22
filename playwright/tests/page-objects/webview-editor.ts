import { expect, type Locator } from '@playwright/test';
import type { WorkspacePage } from './workspace-page';

export class WebViewEditor {
  tab: Locator;
  readonly content: Locator;
  webViewFrame!: Locator;

  constructor(
    readonly wsPage: WorkspacePage,
    private readonly fileName: string,
    nthFrame = 0
  ) {
    this.tab = this.wsPage.page.locator(`div.tab:has-text("${fileName}")`);
    this.content = this.wsPage.page.locator('div.editor-container');
    this.updateWebViewFrameLocator(nthFrame);
  }

  async open() {
    await this.openWebView();
  }

  async openWebView() {
    await this.wsPage.openEditorFile(this.fileName);
    await this.expectTabVisible();
    await this.expectTabActive();
    await this.expectWebViewVisible();
  }

  async save() {
    await this.expectTabDirty();
    await this.wsPage.executeCommand('File: Save');
    await this.expectTabNotDirty();
  }

  async close() {
    await this.expectTabActive();
    await this.wsPage.executeCommand('View: Close Editor');
    await expect(this.tab).toBeHidden();
  }

  async expectTextContent(expected: string) {
    await this.wsPage.executeCommand('View: Reopen Editor With Text Editor');
    await expect(this.content).toContainText(expected);
  }

  async expectTabDirty() {
    await expect(this.tab).toHaveClass(/dirty/);
  }

  async expectTabNotDirty() {
    await expect(this.tab).not.toHaveClass(/dirty/);
  }

  async expectTabActive() {
    await expect(this.tab).toHaveClass(/active/);
  }

  async expectTabInactive() {
    await expect(this.tab).not.toHaveClass(/active/);
  }

  async expectTabVisible() {
    await expect(this.tab).toBeVisible();
  }

  async expectWebViewVisible() {
    await expect(this.webViewFrame).toBeVisible();
  }

  updateWebViewFrameLocator(nthFrame = 0) {
    this.webViewFrame = this.wsPage.page
      .locator('iFrame.webview.ready')
      .nth(nthFrame)
      .contentFrame()
      .locator('iFrame#active-frame')
      .contentFrame()
      .locator('body');
  }
}
