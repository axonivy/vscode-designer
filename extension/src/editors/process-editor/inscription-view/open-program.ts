import type { InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import { Uri } from 'vscode';
import { logWarningMessage } from '../../../base/logging-util';
import { IvyEngineManager } from '../../../engine/engine-manager';
import { JavaProvider } from '../../java-provider';

export const handleOpenProgram = async (args: InscriptionActionArgs) => {
  const project = await IvyEngineManager.instance
    .projects()
    .then(projects => projects?.find(project => project.id.name === args.context.project));
  if (!project) {
    logWarningMessage(`Failed to open Java file. Project not found: ${args.context.project}`);
    return;
  }
  new JavaProvider(Uri.file(project.projectDirectory)).openDefinition(args.payload);
};
