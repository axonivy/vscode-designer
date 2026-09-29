import { isOpenConfigEditorPayload, type InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import { Uri } from 'vscode';
import { executeCommand, type KnownCommand } from '../../../base/commands';
import { logErrorMessage } from '../../../base/logging-util';
import { IvyEngineManager } from '../../../engine/engine-manager';

export const handleOpenConfig = async (command: KnownCommand, args: InscriptionActionArgs) => {
  const payload = parsePayload(command, args);
  const project = isOpenConfigEditorPayload(payload) ? payload.project : args.context.project;
  const projectUri = await resolveProjectUri(project);
  executeCommand(command, projectUri);
};

const parsePayload = (command: KnownCommand, args: InscriptionActionArgs) => {
  if (!args.payload) {
    return;
  }
  try {
    return JSON.parse(args.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logErrorMessage(`Failed to parse payload '${args.payload}' for command '${command}': ${message}`);
    return;
  }
};

const resolveProjectUri = async (projectName: string) => {
  const project = await IvyEngineManager.instance.projects().then(projects => projects?.find(project => project.id.name === projectName));
  if (!project) {
    return;
  }
  return Uri.parse(project.projectDirectory);
};
