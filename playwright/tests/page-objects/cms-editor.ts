import { expect, type Locator } from '@playwright/test';
import { WebViewEditor } from './webview-editor';
import type { WorkspacePage } from './workspace-page';

export class CmsEditor extends WebViewEditor {
  readonly main: Locator;
  readonly help: Locator;

  constructor(wsPage: WorkspacePage, fileName = 'cms_en.yaml') {
    super(wsPage, fileName);
    this.tab = this.wsPage.page.locator('div.tab:has-text("CMS -")');
    this.main = this.webViewFrame.locator('#cms-editor-main');
    this.help = this.webViewFrame.getByRole('button', { name: /Help/ });
  }

  override async expectWebViewVisible() {
    await super.expectWebViewVisible();
    await expect(this.main.locator('.ui-toolbar')).toContainText('CMS -');
  }

  async hasContentObject(contentObject: string) {
    const field = this.webViewFrame.locator('td span').first();
    await expect(field).toHaveText(contentObject);
  }

  rowByName(name: string) {
    return new CmsEditorRow(this, name);
  }
}

export class CmsEditorRow {
  readonly row: Locator;

  constructor(
    readonly editor: CmsEditor,
    readonly name: string
  ) {
    this.row = editor.webViewFrame.locator('.ui-table-row:not(.ui-message-row)').filter({ hasText: name });
  }

  async openInscription() {
    await this.row.click();
    await this.expectSelected();
    return this.editor.webViewFrame.locator('#cms-editor-detail');
  }

  async expectSelected() {
    await expect(this.row).toHaveAttribute('data-state', 'selected');
  }
}
