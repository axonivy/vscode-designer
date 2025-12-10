import { expect, type Locator, type Page } from '@playwright/test';
import { Editor } from './editor';

export class DatabaseEditor extends Editor {
  readonly toolbar: Locator;
  readonly importButton: Locator;

  constructor(page: Page, editorFile = 'databases.yaml') {
    super(editorFile, page);
    this.toolbar = this.viewFrameLocator().locator('.database-editor-main-toolbar');
    this.importButton = this.viewFrameLocator()
      .getByRole('button')
      .getByText(/.*Generate/g);
  }

  override async isViewVisible() {
    await expect(this.toolbar).toContainText('Database Editor');
  }

  async isImportWizardVisible() {
    await expect(this.importButton).toBeVisible();
  }
}
