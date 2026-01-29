import { type Locator, type Page, expect } from '@playwright/test';
import { Editor } from './editor';

export class CaseMapEditor extends Editor {
  stages: Locator;
  detail: Locator;
  helpButton: Locator;

  constructor(page: Page, editorFile = 'CaseMap.icm') {
    super(editorFile, page);
    this.stages = this.viewFrameLocator().locator('.stage-tile');
    this.detail = this.viewFrameLocator().locator('.case-map-editor-detail-panel');
    this.helpButton = this.viewFrameLocator().getByRole('button', { name: 'Open Help' });
  }

  override async isViewVisible() {
    const header = this.viewFrameLocator().locator('.case-map-editor-main-toolbar:has-text("Case Map")');
    await expect(header).toBeVisible();
  }
}
