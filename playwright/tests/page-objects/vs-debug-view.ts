import { expect, type Locator, type Page } from '@playwright/test';
import { PageObject } from './page-object';

export class VsDebugView {
  readonly view: Locator;
  readonly welcome: Locator;
  readonly variablesSection: Locator;
  readonly callStackSection: Locator;

  constructor(readonly page: Page) {
    this.view = page.locator('.debug-viewlet');
    this.welcome = this.view.locator('.welcome-view');
    this.variablesSection = this.view.locator('.debug-variables');
    this.callStackSection = this.view.locator('.debug-call-stack');
  }

  static async showDebugView(page: Page) {
    await new PageObject(page).executeCommand('View: Show Run and Debug');
    const view = new VsDebugView(page);
    await expect(view.welcome).toBeVisible();
    return view;
  }

  async assertBreakpoint(name: string, lineNumber: string) {
    const breakpoint = this.breakpoint(name);
    await expect(breakpoint).toBeVisible();
    await expect(breakpoint.locator('.line-number')).toHaveText(lineNumber);
  }

  async startDebugSession() {
    await new PageObject(this.page).executeCommand('Axon Ivy: Attach Process Debugger');
    await expect(this.welcome).toBeHidden();
    await expect(this.variablesSection).toBeVisible();
    await expect(this.variable('Scope Process Data')).toBeHidden();
  }

  async stopDebugSession() {
    await new PageObject(this.page).executeCommand('Debug: Disconnect');
    await expect(this.welcome).toBeVisible();
    await expect(this.variablesSection).toBeHidden();
  }

  async continueDebugSession() {
    await new PageObject(this.page).executeCommand('Debug: Continue');
  }

  callStackEntry(name: string, fileName: string) {
    return this.callStackSection.getByRole('row', { name: `Stack Frame ${name}, line 0, ${fileName}` });
  }

  variable(name?: string) {
    return this.variablesSection.getByRole('treeitem', { name: name ? new RegExp(`^${name}`) : undefined });
  }

  breakpoint(name: string) {
    return this.view.locator(`.breakpoint:has-text("${name}")`);
  }
}
