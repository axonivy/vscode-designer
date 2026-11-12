import fs from 'fs';
import path from 'path';
import { expect, test } from '~/fixtures/baseTest';
import { ExplorerView, FileExplorer, ProjectExplorerView } from '~/page-objects/explorer-view';
import { mavenScreenshotWorkspacePath } from '~/workspaces/workspace';
import { screenshot } from './screenshot-util';

const modulesPom = `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>ch.ivyteam.ivy.project.demos.ci</groupId>
  <artifactId>crm.modules</artifactId>
  <version>1.0.0-SNAPSHOT</version>
  <packaging>pom</packaging>
  <modules>
    <module>crm</module>
    <module>crmIntegrationTests</module>
  </modules>
</project>
`;

test.describe('maven modules', () => {
  test.use({ workspace: mavenScreenshotWorkspacePath });

  test('maven view', async ({ wsPage, tmpWorkspace }) => {
    test.setTimeout(600_000); // runs 'mvn verify', which can take long without a warm local Maven repository
    await wsPage.hasReadyStatusMessage();
    const workspaceRoot = tmpWorkspace!.tmpWorkspacePath;

    await wsPage.executeCommand('Axon Ivy: New Project', 'crm');
    await wsPage.provideUserInput();
    await wsPage.provideUserInput();
    const projectExplorer = new ProjectExplorerView(wsPage);
    await projectExplorer.openView();
    await projectExplorer.hasNodeExact('crm');

    await wsPage.executeCommand('Axon Ivy: New Test Project', 'crm', 'crmIntegrationTests');
    await wsPage.provideUserInput();
    await wsPage.provideUserInput();
    await wsPage.quickInputList.getByText('IvyTest', { exact: true }).click();
    await wsPage.quickInputBox.press('Enter', { delay: 100 });
    await projectExplorer.hasNodeExact('crmIntegrationTests');

    const testPom = path.join(workspaceRoot, 'crmIntegrationTests', 'pom.xml');
    await expect(async () => {
      const content = await fs.promises.readFile(testPom, 'utf8');
      expect(content).toContain('<artifactId>crm</artifactId>');
      expect(content).toContain('<scope>test</scope>');
    }).toPass();
    const dirtyTab = wsPage.page.locator('div.tab.dirty');
    await expect(async () => {
      if ((await dirtyTab.count()) > 0) {
        await dirtyTab.first().click();
        await wsPage.page.keyboard.press('ControlOrMeta+KeyS');
      }
      await expect(dirtyTab).toHaveCount(0, { timeout: 2_000 });
    }).toPass();
    await wsPage.closeAllTabs();

    await fs.promises.writeFile(path.join(workspaceRoot, 'pom.xml'), modulesPom);
    const explorer = new FileExplorer(wsPage);
    await wsPage.executeCommand('Collapse Folders in Explorer');
    const rootPom = explorer.view.getByText('pom.xml', { exact: true });
    await expect(rootPom).toHaveCount(1);
    await explorer.hasNodeExact('crmIntegrationTests');
    await rootPom.dblclick();
    await wsPage.isTabWithNameVisible('pom.xml');

    const mavenView = new ExplorerView(wsPage, 'Maven');
    const mavenHeader = wsPage.page.getByRole('button', { name: 'Maven Section', exact: true });
    if ((await mavenHeader.getAttribute('aria-expanded')) !== 'true') {
      await mavenHeader.click();
    }
    await expect(mavenHeader).toHaveAttribute('aria-expanded', 'true');
    await mavenView.hasNodeExact('crm.modules');
    await mavenView.hasNodeExact('crmIntegrationTests');

    const verifyOption = wsPage.page.getByRole('menuitem', { name: 'verify', exact: true });
    const openRunMavenCommands = async () => {
      const runMavenCommands = wsPage.page.getByRole('menuitem', { name: 'Run Maven Commands...' });
      await expect(async () => {
        await wsPage.page.keyboard.press('Escape');
        await mavenView.view.getByText('crm.modules', { exact: true }).click({ button: 'right' });
        await expect(runMavenCommands).toBeVisible({ timeout: 2_000 });
      }).toPass();
      await runMavenCommands.hover();
      await expect(verifyOption).toBeVisible();
    };
    await openRunMavenCommands();
    await verifyOption.click({ delay: 100 });

    const testProjectTarget = path.join(workspaceRoot, 'crmIntegrationTests', 'target');
    await expect(async () => {
      const files = await fs.promises.readdir(testProjectTarget);
      expect(files.some(file => file.endsWith('.iar'))).toBeTruthy();
    }).toPass({ timeout: 540_000 });
    await wsPage.page.waitForTimeout(5_000); // let the terminal print the build summary

    await openRunMavenCommands();
    await verifyOption.hover();
    await screenshot(wsPage.page, 'maven-view');
  });
});
