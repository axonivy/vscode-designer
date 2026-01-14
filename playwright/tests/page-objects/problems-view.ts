import { type Page, expect } from '@playwright/test';
import { View, type ViewData } from './view';

const problemsViewData: ViewData = {
  tabSelector: 'li.action-item:has-text("Problems")',
  viewSelector: 'div.markers-panel-container'
};

export class ProblemsView extends View {
  constructor(page: Page) {
    super(problemsViewData, page);
  }

  static async initProblemsView(page: Page) {
    const problemsView = new ProblemsView(page);
    await problemsView.show();
    return problemsView;
  }

  private async hasMaker(message: string, type: 'error' | 'warning', pid?: string) {
    const marker = this.viewLocator.locator(`div.monaco-tl-row:has-text("${message}")`);
    await expect(marker).toBeVisible();
    await expect(marker.locator(`div.marker-icon.${type}`)).toBeVisible();
    if (pid) {
      await expect(marker).toContainText(pid);
    }
  }

  async show() {
    await this.tabLocator.click();
    await this.isChecked();
  }

  async hasWarning(message: string, pid: string) {
    await this.hasMaker(message, 'warning', pid);
  }

  async hasError(message: string, pid?: string) {
    await this.hasMaker(message, 'error', pid);
  }

  async hasNoMarker(message?: string) {
    const marker = message
      ? this.viewLocator.locator(`div.monaco-tl-row:has-text("${message}")`)
      : this.viewLocator.locator('div.monaco-tl-row');
    await expect(marker).not.toBeAttached();
    if (!message) {
      await expect(this.viewLocator).toContainText('No problems have been detected in the workspace.');
    }
  }
}
