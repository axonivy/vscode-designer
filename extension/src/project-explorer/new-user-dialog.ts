import * as vscode from 'vscode';
import { HdInit } from '../engine/api/generated/client';
import { IvyEngineManager } from '../engine/engine-manager';
import { resolveNamespaceFromPath, validateArtifactName, validateDotSeparatedName } from './util';

export const dialogTypes = ['JSF', 'Form', 'JSFOffline'] as const;
export type DialogType = (typeof dialogTypes)[number];

const layouts = [
  'Page Responsive Grid 2 Columns',
  'Page Responsive Grid 4 Columns',
  'Page Responsive Top Labels',
  'Page Panel Grid',
  'Component',
  'Page'
] as const;
type Layout = (typeof layouts)[number];

const templates = ['frame-10', 'frame-10-right', 'frame-10-full-width', 'basic-10'] as const;
type Template = (typeof templates)[number];

export type NewUserDialogParams = HdInit;

export const addNewUserDialog = async (selectedUri: vscode.Uri, projectDir: string, type: DialogType, pid?: string) => {
  const input = await collectNewUserDialogParams(selectedUri, type, projectDir);
  if (input) {
    await IvyEngineManager.instance.createUserDialog({ pid, ...input });
  }
};

const collectNewUserDialogParams = async (selectedUri: vscode.Uri, type: DialogType, projectDir: string) => {
  const name = await collectName();
  if (!name) {
    return;
  }
  const namespace = await collectNamespace(selectedUri, projectDir);
  if (!namespace) {
    return;
  }
  if (type === 'Form') {
    return { name, namespace, type, projectDir };
  }
  if (type === 'JSFOffline') {
    return { name, namespace, type, layout: 'Page', projectDir };
  }
  const layout = await collectLayout();
  if (!layout) {
    return;
  }
  if (layout === 'Component') {
    return { name, namespace, type, layout, projectDir };
  }
  const template = await collectTemplate();
  if (!template) {
    return;
  }
  return { name, namespace, type, template: template, layout, projectDir };
};

const collectName = async () => {
  return vscode.window.showInputBox({
    title: 'User Dialog Name',
    placeHolder: 'Enter a name',
    ignoreFocusOut: true,
    validateInput: validateArtifactName
  });
};

const collectNamespace = async (selectedUri: vscode.Uri, projectDir: string) => {
  const namespace = await resolveNamespaceFromPath(selectedUri, projectDir, 'src_hd');
  return vscode.window.showInputBox({
    title: 'User Dialog Namespace',
    value: namespace,
    valueSelection: [namespace.length, -1],
    ignoreFocusOut: true,
    validateInput: validateDotSeparatedName
  });
};

const collectLayout = async () => {
  return (await vscode.window.showQuickPick(
    layouts.filter(t => t !== 'Page'),
    {
      title: 'Select Layout',
      ignoreFocusOut: true
    }
  )) as Layout;
};

const collectTemplate = async () => {
  return (await vscode.window.showQuickPick(templates, {
    title: 'Select Template',
    ignoreFocusOut: true
  })) as Template;
};
