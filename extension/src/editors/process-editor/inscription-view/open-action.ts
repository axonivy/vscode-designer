import { isOpenActionPayload, type InscriptionActionArgs } from '@axonivy/process-editor-inscription-protocol';
import { l10n, Uri } from 'vscode';
import { executeCommand, type KnownCommand } from '../../../base/commands';
import { logErrorMessage } from '../../../base/logging-util';
import { IvyEngineManager } from '../../../engine/engine-manager';

export type OpenActionMessage =
  | {
      method: 'selectElement';
      payload: string;
    }
  | {
      method: 'openAdd';
      payload?: never;
    };

export const handleOpenAction = async (command: KnownCommand, args: InscriptionActionArgs) => {
  const payload = parsePayload(command, args);
  const openActionPayload = isOpenActionPayload(payload) ? payload : undefined;
  const project = openActionPayload?.project ?? args.context.project;
  const message: OpenActionMessage | undefined = openActionPayload?.selection
    ? { method: 'selectElement', payload: openActionPayload.selection }
    : undefined;
  openAction(command, project, message);
};

export const handleNewAction = async (command: KnownCommand, args: InscriptionActionArgs) => {
  openAction(command, args.context.project, { method: 'openAdd' });
};

export const openAction = async (command: KnownCommand, project: string, message?: OpenActionMessage) => {
  const projectUri = await resolveProjectUri(project);
  executeCommand(command, projectUri, message);
};

const parsePayload = (command: KnownCommand, args: InscriptionActionArgs) => {
  if (!args.payload) {
    return;
  }
  try {
    return JSON.parse(args.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logErrorMessage(l10n.t("Failed to open config. Could not parse payload '{0}' for command '{1}': {2}", args.payload, command, message));
  }
};

const resolveProjectUri = async (projectName: string) => {
  const project = await IvyEngineManager.instance.projects().then(projects => projects?.find(project => project.id.name === projectName));
  if (!project) {
    return;
  }
  return Uri.file(project.projectDirectory);
};
