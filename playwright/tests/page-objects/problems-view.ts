import { type Locator, expect } from '@playwright/test';
import type { WorkspacePage } from './workspace-page';

export class ProblemsView {
  readonly tab: Locator;
  readonly view: Locator;

  constructor(readonly wsPage: WorkspacePage) {
    this.tab = wsPage.page.locator('li.action-item:has-text("Problems")');
    this.view = wsPage.page.locator('div.markers-panel-container');
  }

  static async initProblemsView(wsPage: WorkspacePage) {
    const problemsView = new ProblemsView(wsPage);
    if (await problemsView.tab.isHidden()) {
      await wsPage.page.locator('#status\\.problems').click();
    }
    await problemsView.show();
    return problemsView;
  }

  private async hasMarker(message: string, type: 'error' | 'warning', timeout?: number) {
    const marker = this.view.locator(`div.monaco-tl-row:has-text("${message}")`).first();
    await expect(marker).toHaveCount(1, { timeout });
    await expect(marker).toBeVisible({ timeout });
    await expect(marker.locator(`div.marker-icon.${type}`)).toBeVisible({ timeout });
  }

  async show() {
    await this.tab.click();
    await expect(this.tab).toHaveClass(/checked/);
  }

  async hasWarning(message: string) {
    await this.hasMarker(message, 'warning');
  }

  async hasError(message: string, timeout?: number) {
    await this.hasMarker(message, 'error', timeout);
  }

  async hasNumOfMarkers(count: number) {
    const marker = this.view.locator('div.marker-icon');
    await expect(marker).toHaveCount(count);
    if (count === 0) {
      await expect(this.view).toContainText('No problems have been detected in the workspace.');
    }
  }
}
