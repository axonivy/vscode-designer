import { expect, type Locator } from '@playwright/test';
import { WebViewEditor } from './editor';
import type { WorkspacePage } from './workspace-page';

export class ProcessEditor extends WebViewEditor {
  constructor(wsPage: WorkspacePage, fileName: string = 'ProcurementRequestUserTask.p.json', frameIndex?: number) {
    super(wsPage, fileName, frameIndex);
  }

  get graph() {
    return this.webViewFrame.locator('#sprotty .sprotty-graph');
  }

  get toolbar() {
    return this.webViewFrame.locator('.ivy-tool-bar');
  }

  elementByPID(pid: string) {
    return this.graph.locator(`[id$="_${pid}"]`);
  }

  elementByType(type: string) {
    return this.graph.locator(`.${type.replaceAll(':', '\\:')}`);
  }

  async openInscriptionView(pid: string) {
    await this.elementByPID(pid).click();
    const view = this.inscriptionView();
    if (await view.parent.isHidden()) {
      await this.webViewFrame.locator('#btn_inscription_toggle').click();
    }
    await view.assertViewVisible();
    return view;
  }

  inscriptionView() {
    return new InscriptionView(this.wsPage, this.webViewFrame.locator('.inscription-ui-container'));
  }

  async startProcessAndAssertExecuted(startEvent: Locator, executedElement: Locator) {
    await startEvent.locator('circle').click();
    await this.assertSelected(startEvent);
    const playButton = this.quickActionBar.getByRole('button', { name: /Start Process/ });
    await playButton.click({ delay: 100 });
    await expect(executedElement).toHaveClass(/executed/);
  }

  async addBreakpoint(element: Locator) {
    await element.click();
    await this.assertSelected(element);
    await this.quickActionBar.getByRole('button', { name: /Toggle Breakpoint/ }).click();
    await expect(element.locator('.ivy-breakpoint-handle')).toBeVisible();
  }

  get quickActionBar() {
    return this.webViewFrame.locator('.quick-actions-bar');
  }

  async assertNotExecuted(element: Locator) {
    await expect(element).not.toHaveClass(/executed/);
  }

  async assertStopped(element: Locator) {
    await expect(element).toHaveClass(/stopped/);
  }

  async assertNotStopped(element: Locator) {
    await expect(element).not.toHaveClass(/stopped/);
  }

  async appendActivity(target: Locator, activityName: string) {
    await target.click();
    await this.assertSelected(target);
    const activities = this.webViewFrame.getByTitle('Activities (A)');
    await activities.click();
    const newItemButton = this.webViewFrame.locator('div.quick-action-bar-menu').getByRole('button', { name: activityName }).first();
    await newItemButton.click();
  }

  async assertSelected(element: Locator) {
    await expect(element).toHaveClass(/selected/);
  }

  async hasWarning(element: Locator) {
    await expect(element).toHaveClass(/warning/);
  }

  async hasError(element: Locator) {
    await expect(element).toHaveClass(/error/);
  }

  async hasNoValidationMarker(element: Locator) {
    await expect(element).not.toHaveClass(/warning/);
    await expect(element).not.toHaveClass(/error/);
  }
}

class InscriptionView {
  constructor(
    readonly wsPage: WorkspacePage,
    readonly parent: Locator
  ) {}

  async assertViewVisible() {
    await expect(this.parent).toBeVisible();
  }

  get header() {
    return this.parent.locator('.header');
  }

  async openInscriptionTab(name: string) {
    const inscriptionTab = this.parent.getByRole('tab', { name: name });
    await expect(inscriptionTab).toBeVisible();
    if ((await inscriptionTab.getAttribute('aria-selected')) !== 'true') {
      await inscriptionTab.click();
    }
  }

  async openCollapsible(name: string) {
    await this.openOrCloseCollapsible(name, true);
  }

  async closeCollapsible(name: string) {
    await this.openOrCloseCollapsible(name, false);
  }

  private async openOrCloseCollapsible(name: string, openIt: boolean) {
    const collapsible = this.parent.locator(`.ui-collapsible-trigger:has-text("${name}")`);
    if ((await collapsible.getAttribute('data-state')) === (openIt ? 'closed' : 'open')) {
      await collapsible.click();
    }
    await expect(collapsible).toHaveAttribute('data-state', openIt ? 'open' : 'closed');
  }

  inputFieldFor(label: string) {
    return this.parent.getByLabel(label, { exact: true });
  }

  cellInsideTable(tableCount: number, cellCount: number) {
    const firstTable = this.parent.getByRole('table').nth(tableCount);
    return firstTable.getByRole('cell').nth(cellCount);
  }

  async clickButton(label: string) {
    await this.parent.getByRole('button', { name: label }).click();
  }

  get monacoEditor() {
    return this.parent.locator('.view-lines.monaco-mouse-cursor-text');
  }

  async triggerMonacoContentAssist() {
    await this.wsPage.page.keyboard.press('Control+Space');
  }

  async writeToMonacoEditorWithCompletion(input: string, expectedCompletion: string) {
    await this.wsPage.page.keyboard.type(input, { delay: 50 });
    const contentAssist = this.monacoContentAssist;
    await expect(contentAssist).toBeVisible();
    await contentAssist.getByText(expectedCompletion).first().locator('span.highlight').click();
    await expect(contentAssist).toBeHidden();
  }

  get monacoContentAssist() {
    return this.parent.locator('div.editor-widget.suggest-widget');
  }
}
