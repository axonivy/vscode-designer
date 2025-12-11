import { expect, type Page } from '@playwright/test';
import { Editor } from './editor';

export class DataClassEditor extends Editor {
  constructor(page: Page, editorFile: string = 'DataClassEditorTest.d.json') {
    super(editorFile, page);
  }

  override async isViewVisible() {
    await this.isTabVisible();
    await expect(this.toolbar).toContainText('Data Class -');
  }

  get toolbar() {
    return this.viewFrameLocator().locator('div.dataclass-editor-main-toolbar');
  }
}
