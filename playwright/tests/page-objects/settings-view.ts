import { type Page, expect } from '@playwright/test';
import { getCtrlOrMeta } from '../utils/keyboard';
import { View, type ViewData } from './view';

const settingsViewData: ViewData = {
  tabSelector: 'div.tab.tab-actions-right',
  viewSelector: 'div.editor-instance'
};

export class SettingsView extends View {
  constructor(page: Page) {
    super(settingsViewData, page);
  }

  async openWorkspaceSettings() {
    await this.executeCommand('Preferences: Open Workspace Settings (JSON)');
  }

  async openDefaultSettings() {
    await this.executeCommand('Preferences: Open Default Settings (JSON)');
  }

  async containsSetting(expectedSetting: string) {
    await expect(this.viewLocator).toBeVisible();
    await this.viewLocator.click();
    await this.page.keyboard.press(getCtrlOrMeta() + '+KeyF');
    await this.page.keyboard.insertText(expectedSetting);
    await expect(this.viewLocator.locator('div.find-widget')).toContainText('1 of 1');
  }
}
