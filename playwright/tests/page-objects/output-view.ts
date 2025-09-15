import { type Page, expect } from '@playwright/test';
import { View, type ViewData } from './view';

const outputViewData: ViewData = {
  tabSelector: 'li.action-item:has-text("Output")',
  viewSelector: 'div.output-view'
};

export class OutputView extends View {
  constructor(page: Page) {
    super(outputViewData, page);
  }

  async checkIfEngineStarted() {
    const expectedText = 'Axon Ivy Engine is running and ready to serve.';
    await expect(async () => {
      await expect(this.viewLocator).toContainText(expectedText);
    }).toPass();
  }
}
