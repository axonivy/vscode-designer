import { Page, expect } from '@playwright/test';
import { View, ViewData } from './view';

export class BrowserView extends View {
  constructor(page: Page) {
    const outputViewData: ViewData = {
      tabSelector: 'li.action-item:has-text("Browser")',
      viewSelector: 'body > div > div:not([data-parent-flow-to-element-id]) >> visible = true',
      viewName: 'Browser'
    };
    super(outputViewData, page);
  }

  override async isViewVisible() {
    await expect(this.header()).toBeVisible();
  }

  async openDevWfUi() {
    await this.executeCommand('Open Developer Workflow UI');
  }

  async openCockpit() {
    await this.executeCommand('Open Engine Cockpit');
  }

  back() {
    return this.header().locator('.back-button');
  }

  forward() {
    return this.header().locator('.forward-button');
  }

  reload() {
    return this.header().locator('.reload-button');
  }

  input() {
    return this.header().locator('.url-input');
  }

  home() {
    return this.header().locator('.open-home-button');
  }

  external() {
    return this.header().locator('.open-external-button');
  }

  content() {
    return this.viewFrameLoactor().locator('.content').frameLocator('iFrame');
  }

  private header() {
    return this.viewFrameLoactor().locator('.header');
  }
}
