import { type Locator, expect } from '@playwright/test';
import type { WorkspacePage } from './workspace-page';

export class SettingsView {
  readonly tab: Locator;
  readonly view: Locator;

  constructor(readonly wsPage: WorkspacePage) {
    this.tab = wsPage.page.locator('div.tab.tab-actions-right');
    this.view = wsPage.page.locator('div.editor-instance');
  }

  async openWorkspaceSettings() {
    await this.wsPage.executeCommand('Preferences: Open Workspace Settings (JSON)');
  }

  async openDefaultSettings() {
    await this.wsPage.executeCommand('Preferences: Open Default Settings (JSON)');
  }

  async containsSetting(expectedSetting: string) {
    await this.search(expectedSetting);
    await expect(this.view.locator('div.find-widget')).toContainText('1 of 1');
  }

  async doesNotContainSetting(unexpectedSetting: string) {
    await this.search(unexpectedSetting);
    await expect(this.view.locator('div.find-widget')).toContainText('No results');
  }

  async search(text: string) {
    await expect(this.view).toBeVisible();
    await this.view.click();
    await this.wsPage.page.keyboard.press('ControlOrMeta+KeyF');
    await this.wsPage.page.keyboard.insertText(text);
  }
}
