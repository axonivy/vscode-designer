import { expect, type Locator } from '@playwright/test';
import { ExplorerView } from './explorer-view';
import type { WorkspacePage } from './workspace-page';

export class MavenView extends ExplorerView {
  private readonly header: Locator;

  constructor(wsPage: WorkspacePage) {
    super(wsPage, 'Maven');
    this.header = wsPage.page.getByRole('button', { name: 'Maven Section', exact: true });
  }

  override async openView() {
    if ((await this.header.getAttribute('aria-expanded')) !== 'true') {
      await this.header.click();
    }
    await expect(this.header).toHaveAttribute('aria-expanded', 'true');
  }

  private goal(name: string) {
    return this.wsPage.page.getByRole('menuitem', { name, exact: true });
  }

  private async openRunMavenCommands(project: string) {
    const runMavenCommands = this.wsPage.page.getByRole('menuitem', { name: 'Run Maven Commands...' });
    await expect(async () => {
      await this.wsPage.page.keyboard.press('Escape');
      await this.view.getByText(project, { exact: true }).click({ button: 'right' });
      await expect(runMavenCommands).toBeVisible({ timeout: 2_000 });
    }).toPass();
    await runMavenCommands.hover();
  }

  async hoverGoal(project: string, goal: string) {
    await this.openRunMavenCommands(project);
    await this.goal(goal).hover();
  }
}
