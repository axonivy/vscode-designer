import { expect, type Locator, type Page } from '@playwright/test';
import { Editor } from './editor';

export class DatabaseEditor extends Editor {
  readonly toolbar: Locator;
  readonly inscription: Locator;
  readonly importButton: Locator;
  readonly helpButton: Locator;

  constructor(page: Page, editorFile = 'databases.yaml') {
    super(editorFile, page);
    this.toolbar = this.viewFrameLocator().locator('.database-editor-toolbar');
    this.inscription = this.viewFrameLocator().locator('.database-editor-detail-panel');
    this.importButton = this.viewFrameLocator().getByLabel('Generate');
    this.helpButton = this.viewFrameLocator().getByRole('button', { name: 'Open Help' });
  }

  override async isViewVisible() {
    await expect(this.toolbar).toContainText('Database Editor');
  }

  async isImportWizardVisible() {
    await expect(this.importButton).toBeVisible();
  }
}
