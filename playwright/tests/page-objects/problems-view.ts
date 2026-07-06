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

  private async hasMaker(message: string, type: 'error' | 'warning', pid?: string) {
    const marker = this.view.locator(`div.monaco-tl-row:has-text("${message}")`).first();
    await expect(marker).toBeVisible();
    await expect(marker.locator(`div.marker-icon.${type}`)).toBeVisible();
    if (pid) {
      await expect(marker).toContainText(pid);
    }
  }

  async show() {
    await this.tab.click();
    await expect(this.tab).toHaveClass(/checked/);
  }

  async hasWarning(message: string, pid: string) {
    await this.hasMaker(message, 'warning', pid);
  }

  async hasError(message: string, pid?: string) {
    await this.hasMaker(message, 'error', pid);
  }

  async hasNoMarker() {
    const marker = this.view.locator('div.monaco-tl-row');
    await expect(marker).not.toBeAttached();
    await expect(this.view).toContainText('No problems have been detected in the workspace.');
  }
}
