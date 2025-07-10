import { expect, Locator, Page } from '@playwright/test';
import { Editor } from './editor';

export class CmsEditor extends Editor {
  readonly toolbar: Locator;
  readonly help: Locator;

  constructor(page: Page, editorFile = 'cms_en.yaml') {
    super(editorFile, page);
    this.toolbar = this.viewFrameLoactor().locator('.cms-editor-main-toolbar');
    this.help = this.viewFrameLoactor().getByRole('button', { name: /Help/ });
  }

  override async isViewVisible() {
    await expect(this.toolbar).toContainText('CMS -');
  }

  async hasContentObject(contentObject: string) {
    const field = this.viewFrameLoactor().locator('td span').first();
    await expect(field).toHaveText(contentObject);
  }
}
