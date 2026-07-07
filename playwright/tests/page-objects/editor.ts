import { expect, type Locator } from '@playwright/test';
import { webViewFrameLocator } from './webview-util';
import type { WorkspacePage } from './workspace-page';

abstract class Editor {
  tab: Locator;

  constructor(
    readonly wsPage: WorkspacePage,
    readonly fileName: string
  ) {
    this.tab = this.wsPage.page.locator(`div.tab:has-text("${fileName}")`);
  }

  abstract open(): Promise<void>;

  async close() {
    await this.expectTabActive();
    await this.wsPage.executeCommand('View: Close Editor');
    await expect(this.tab).toBeHidden();
  }

  async save(options?: { force?: boolean }) {
    if (!options?.force) {
      await this.expectTabDirty();
    }
    await this.wsPage.executeCommand('File: Save');
    await this.expectTabNotDirty();
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

  async expectHasBreadCrumbs(...breadCrumbs: Array<string>) {
    const breadCrumbsLocator = this.wsPage.page.locator('div.breadcrumbs-below-tabs').getByRole('listitem');
    for (let i = 0; i < breadCrumbs.length; i++) {
      await expect(breadCrumbsLocator.nth(i)).toHaveText(breadCrumbs[i]!);
    }
  }
}

export class TextEditor extends Editor {
  content: Locator;

  constructor(wsPage: WorkspacePage, fileName: string) {
    super(wsPage, fileName);
    this.content = this.wsPage.page.locator('div.editor-container');
  }

  override async open() {
    await this.wsPage.openEditorFile(this.fileName);
    await this.expectTabVisible();
  }

  async goToLineColumn(line: number, column: number) {
    await this.wsPage.page.locator('#status\\.editor\\.selection').click();
    await this.wsPage.provideUserInput(`:${line}:${column}`);
    await expect(this.wsPage.page.locator('a.statusbar-item-label').getByText(`Ln ${line}, Col ${column}`)).toBeVisible();
  }
}

export class WebViewEditor extends Editor {
  readonly content: Locator;
  webViewFrame!: Locator;

  constructor(wsPage: WorkspacePage, fileName: string, nthFrame = 0) {
    super(wsPage, fileName);
    this.content = this.wsPage.page.locator('div.editor-container');
    this.updateWebViewFrameLocator(nthFrame);
  }

  override async open() {
    await this.wsPage.openEditorFile(this.fileName);
    await this.expectTabVisible();
    await this.expectTabActive();
    await this.expectWebViewVisible();
  }

  async expectTextContent(expected: string) {
    await this.wsPage.executeCommand('View: Reopen Editor With Text Editor');
    await expect(this.content).toContainText(expected);
  }

  async expectWebViewVisible() {
    await expect(this.webViewFrame).toBeVisible();
  }

  updateWebViewFrameLocator(nthFrame = 0) {
    this.webViewFrame = webViewFrameLocator(this.wsPage, nthFrame);
  }
}
