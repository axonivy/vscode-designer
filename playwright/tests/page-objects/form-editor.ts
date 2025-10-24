import { expect, type Page } from '@playwright/test';
import { Editor } from './editor';

export class FormEditor extends Editor {
  constructor(page: Page, editorFile: string = 'testForm.f.json') {
    super(editorFile, page);
  }

  override async isViewVisible() {
    await this.isTabVisible();
    const graph = this.viewFrameLoactor().locator('#canvas');
    await expect(graph).toBeVisible();
  }

  locatorFor(type: string) {
    return this.viewFrameLoactor().locator(type);
  }

  get toolbar() {
    return this.viewFrameLoactor().locator('.toolbar');
  }
}
