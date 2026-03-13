import { expect } from '@playwright/test';
import { test } from '../fixtures/baseTest';
import { DataClassEditor } from '../page-objects/data-class-editor';
import { Editor } from '../page-objects/editor';
import { FileExplorer } from '../page-objects/explorer-view';

test.describe('Create Data Class', () => {
  test('Add new Data Class', async ({ page }) => {
    const explorer = new FileExplorer(page);
    await explorer.hasDeployProjectStatusMessage();
    const dataClassName = 'testCreateData';
    await explorer.addDataClass(dataClassName, 'ch.ivyteam.test.data');
    await explorer.hasNode(`${dataClassName}.d.json`);
    const dataClassEditor = new DataClassEditor(page, `${dataClassName}.d.json`);
    await dataClassEditor.isViewVisible();
    const javaEditor = new Editor(`${dataClassName}.java`, page);
    await javaEditor.openEditorFile();
    await javaEditor.isTabVisible();
    const content = javaEditor.editorContent();
    await expect(content).toContainText(`package ch.ivyteam.test.data;`);
    await expect(content).toContainText(`public class ${dataClassName} extends ch.ivyteam.ivy.scripting.objects.CompositeObject`);
  });

  test('Add new Entity Class', async ({ page }) => {
    const explorer = new FileExplorer(page);
    await explorer.hasDeployProjectStatusMessage();
    const entityClassName = 'testCreateEntity';
    await explorer.addEntityClass(entityClassName, 'ch.ivyteam.test.data');
    await explorer.hasNode(`${entityClassName}.d.json`);
    const dataClassEditor = new DataClassEditor(page, `${entityClassName}.d.json`);
    await dataClassEditor.isEntityViewVisible();
    const javaEditor = new Editor(`${entityClassName}.java`, page);
    await javaEditor.openEditorFile();
    await javaEditor.isTabVisible();
    const content = javaEditor.editorContent();
    await expect(content).toContainText(`package ch.ivyteam.test.data;`);
    await expect(content).toContainText(`public class ${entityClassName} extends ch.ivyteam.ivy.scripting.objects.CompositeObject`);
    await expect(content).toContainText('@jakarta.persistence.Entity');
  });
});
