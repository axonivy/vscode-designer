import { expect, type Locator, type Page } from '@playwright/test';
import { Editor } from './editor';

export class CmsEditor extends Editor {
  readonly toolbar: Locator;
  readonly help: Locator;

  constructor(page: Page, editorFile = 'cms_en.yaml') {
    super(editorFile, page);
    this.toolbar = this.viewFrameLocator().locator('.cms-editor-main-toolbar');
    this.help = this.viewFrameLocator().getByRole('button', { name: /Help/ });
  }

  override async isViewVisible() {
    await expect(this.toolbar).toContainText('CMS -');
  }

  async hasContentObject(contentObject: string) {
    const field = this.viewFrameLocator().locator('td span').first();
    await expect(field).toHaveText(contentObject);
  }
}
