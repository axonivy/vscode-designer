import { type Locator, type Page, expect } from '@playwright/test';
import { Editor } from './editor';

export class CaseMapEditor extends Editor {
  main: Locator;
  stages: Locator;
  detail: Locator;
  helpButton: Locator;

  constructor(page: Page, editorFile = 'CaseMap.m.json') {
    super(editorFile, page);
    this.main = this.viewFrameLocator().locator('#case-map-editor-main');
    this.stages = this.main.locator('[data-element-type="stage"]');
    this.detail = this.viewFrameLocator().locator('#case-map-editor-detail');
    this.helpButton = this.detail.getByRole('button', { name: 'Open Help' });
  }

  override async isViewVisible() {
    const header = this.main.locator('.ui-toolbar:has-text("Case Map")');
    await expect(header).toBeVisible();
  }
}
