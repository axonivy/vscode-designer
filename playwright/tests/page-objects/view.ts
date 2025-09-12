import { type FrameLocator, type Locator, type Page, expect } from '@playwright/test';
import { PageObject } from './page-object';

export interface ViewData {
  tabSelector: string;
  viewSelector: string;
}

export class View extends PageObject {
  constructor(
    protected readonly data: ViewData,
    page: Page
  ) {
    super(page);
  }

  get tabLocator(): Locator {
    return this.page.locator(this.data.tabSelector);
  }

  get viewLocator(): Locator {
    return this.page.locator(this.data.viewSelector);
  }

  viewFrameLoactor(): FrameLocator {
    return this.viewLocator.frameLocator('iFrame').frameLocator('iFrame#active-frame');
  }

  async isTabVisible() {
    await expect(this.tabLocator).toBeVisible();
  }

  async isViewVisible() {
    await expect(this.viewLocator).toBeVisible();
  }

  async isChecked() {
    await expect(this.tabLocator).toHaveClass(/checked/);
  }

  async isInactive() {
    await expect(this.tabLocator).not.toHaveClass(/active/);
  }

  async isDirty() {
    await expect(this.tabLocator).toHaveClass(/dirty/);
  }

  async isNotDirty() {
    await expect(this.tabLocator).not.toHaveClass(/dirty/);
  }
}
