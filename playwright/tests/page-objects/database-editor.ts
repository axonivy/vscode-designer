import { expect, type Locator, type Page } from '@playwright/test';
import { Editor } from './editor';

export class DatabaseEditor extends Editor {
  readonly toolbar: Locator;
  readonly importButton: Locator;

  constructor(page: Page, editorFile = 'databases.yaml') {
    super(editorFile, page);
    this.toolbar = this.viewFrameLoactor().locator('.database-editor-main-toolbar');
    this.importButton = this.viewFrameLoactor().getByText('Import from Database');
  }

  override async isViewVisible() {
    await expect(this.toolbar).toContainText('Database Editor');
  }

  async isImportWizardVisible() {
    await expect(this.importButton).toBeVisible();
  }
}
