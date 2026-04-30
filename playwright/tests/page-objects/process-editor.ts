import { expect, type Locator, type Page } from '@playwright/test';
import { Editor } from './editor';
import { InscriptionView } from './inscription-view';

export class ProcessEditor extends Editor {
  constructor(page: Page, editorFile: string = 'ProcurementRequestUserTask.p.json', frameIndex?: number) {
    super(editorFile, page, frameIndex);
  }

  override async isViewVisible() {
    await this.isTabVisible();
    await expect(this.graphLocator()).toBeVisible();
  }

  graphLocator() {
    return this.viewFrameLocator().locator('#sprotty .sprotty-graph');
  }

  get toolbar() {
    return this.viewFrameLocator().locator('.ivy-tool-bar');
  }

  locatorForPID(pid: string) {
    return this.graphLocator().locator(`[id$="_${pid}"]`);
  }

  locatorForElementType(type: string) {
    return this.graphLocator().locator(type);
  }

  async openInscriptionView(pid: string) {
    await this.locatorForPID(pid).click();
    const view = this.inscriptionView();
    if (await view.parent.isHidden()) {
      await this.viewFrameLocator().locator('#btn_inscription_toggle').click();
    }
    await view.assertViewVisible();
    return view;
  }

  inscriptionView() {
    return new InscriptionView(this.page, this.viewFrameLocator().locator('.inscription-ui-container'));
  }

  async startProcessAndAssertExecuted(startEvent: Locator, executedElement: Locator) {
    await startEvent.locator('circle').click();
    await this.assertSelected(startEvent);
    const playButton = this.quickActionBar.getByRole('button', { name: /Start Process/ });
    await playButton.click();
    await this.assertExecuted(executedElement);
  }

  async addBreakpoint(element: Locator) {
    await element.click();
    await this.assertSelected(element);
    await this.quickActionBar.getByRole('button', { name: /Toggle Breakpoint/ }).click();
    await expect(element.locator('.ivy-breakpoint-handle')).toBeVisible();
  }

  get quickActionBar() {
    return this.viewFrameLocator().locator('.quick-actions-bar');
  }

  async assertExecuted(element: Locator) {
    await expect(element).toHaveClass(/executed/);
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
    const activities = this.viewFrameLocator().getByTitle('Activities (A)');
    await activities.click();
    const newItemButton = this.viewFrameLocator().locator('div.quick-action-bar-menu').getByRole('button', { name: activityName }).first();
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
