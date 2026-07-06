import { type Locator, expect } from '@playwright/test';
import type { WorkspacePage } from './workspace-page';

export class OutputView {
  readonly tab: Locator;
  readonly view: Locator;
  readonly sourceSelection: Locator;
  readonly logEntries: Locator;

  constructor(readonly wsPage: WorkspacePage) {
    this.tab = wsPage.page.locator('li.action-item:has-text("Output")');
    this.view = wsPage.page.locator('div.output-view');
    this.sourceSelection = wsPage.page.getByRole('toolbar', { name: 'Output actions', includeHidden: false }).locator('select');
    this.logEntries = wsPage.page.locator('div.output-view').locator('.view-lines');
  }

  async open() {
    await this.wsPage.executeCommand('Output: Focus on Output View');
  }

  async checkIfEngineStarted() {
    const expectedText = 'Axon Ivy Engine is running and ready to serve.';
    await expect(async () => {
      await expect(this.view).toContainText(expectedText);
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
