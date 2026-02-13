import { type Locator, type Page, expect } from '@playwright/test';
import { View, type ViewData } from './view';

const outputViewData: ViewData = {
  tabSelector: 'li.action-item:has-text("Output")',
  viewSelector: 'div.output-view'
};

export class OutputView extends View {
  readonly sourceSelection: Locator;
  readonly logEntries: Locator;
  constructor(page: Page) {
    super(outputViewData, page);
    this.sourceSelection = page.getByRole('toolbar', { name: 'Output actions', includeHidden: false }).locator('select');
    this.logEntries = page.locator('div.output-view').locator('.view-lines');
  }

  async open() {
    await this.executeCommand('Output: Focus on Output View');
  }

  async checkIfEngineStarted() {
    const expectedText = 'Axon Ivy Engine is running and ready to serve.';
    await expect(async () => {
      await expect(this.viewLocator).toContainText(expectedText);
    }).toPass();
  }

  async openLog(name: string) {
    await this.open();
    await this.sourceSelection.click();
    await this.sourceSelection.selectOption({ label: name });
  }

  async expectLogEntry(entry: string | RegExp) {
    await expect(this.logEntries).toContainText(entry);
  }
}
