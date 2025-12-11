import { expect, type Page } from '@playwright/test';
import { Editor } from './editor';

export class FormEditor extends Editor {
  constructor(page: Page, editorFile: string = 'testForm.f.json') {
    super(editorFile, page);
  }

  override async isViewVisible() {
    await this.isTabVisible();
    const graph = this.viewFrameLocator().locator('#canvas');
    await expect(graph).toBeVisible();
  }

  locatorFor(type: string) {
    return this.viewFrameLocator().locator(type);
  }

  get toolbar() {
    return this.viewFrameLocator().locator('.toolbar');
  }
}
