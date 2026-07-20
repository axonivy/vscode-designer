import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { DataClassEditor } from '~/page-objects/dataclass-editor';
import { TextEditor } from '~/page-objects/editor';
import { FileExplorer } from '~/page-objects/explorer-view';

test('Add new Data Class', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  const dataClassName = 'testCreateData';
  await explorer.addDataClass(dataClassName, 'ch.ivyteam.test.data');
  await explorer.hasNodeExact(`${dataClassName}.d.json`);
  const dataClassEditor = new DataClassEditor(wsPage, `${dataClassName}.d.json`);
  await dataClassEditor.expectWebViewVisible();
  const javaEditor = new TextEditor(wsPage, `${dataClassName}.java`);
  await javaEditor.open();
  await expect(javaEditor.content).toContainText(`package ch.ivyteam.test.data;`);
  await expect(javaEditor.content).toContainText(`public class ${dataClassName} extends ch.ivyteam.ivy.scripting.objects.CompositeObject`);
});

test('Add new Entity Class', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  const entityClassName = 'testCreateEntity';
  await explorer.addEntityClass(entityClassName, 'ch.ivyteam.test.data');
  await explorer.hasNodeExact(`${entityClassName}.d.json`);
  const dataClassEditor = new DataClassEditor(wsPage, `${entityClassName}.d.json`);
  await dataClassEditor.expectEntityViewVisible();
  const javaEditor = new TextEditor(wsPage, `${entityClassName}.java`);
  await javaEditor.open();
  await expect(javaEditor.content).toContainText(`package ch.ivyteam.test.data;`);
  await expect(javaEditor.content).toContainText(`public class ${entityClassName} extends ch.ivyteam.ivy.scripting.objects.CompositeObject`);
  await expect(javaEditor.content).toContainText('@jakarta.persistence.Entity');
});
