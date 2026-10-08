import { exec } from 'child_process';
import { promisify } from 'node:util';
import { l10n, workspace, type WorkspaceFolder } from 'vscode';
import { logInformationMessage, logWarningMessage } from './logging-util';

const DEFAULT_MAVEN_EXECUTABLE = 'mvn';
const MAVEN_SETTING_GROUP = 'maven';
const MAVEN_SETTING_EXECUTABLE_PATH = 'executable.path';
export const MAVEN_SETTING_KEY = `${MAVEN_SETTING_GROUP}.${MAVEN_SETTING_EXECUTABLE_PATH}`;
const EXPECTED_MAVEN_VERSION = '3.9';

const execAsync = promisify(exec);

export type MvnSettingExecutable = {
  scope: 'workspace' | 'user';
  value: string;
  workspaceFolder?: WorkspaceFolder;
};

const localizeScope = (scope: MvnSettingExecutable['scope']) => (scope === 'user' ? l10n.t('user') : l10n.t('workspace'));

export const validateMavenExecutable = async () => {
  const mvnExecutables = getMvnExecutables();
  const mvnExectuableUser = mvnExecutables.find(mvnExecutable => mvnExecutable.scope === 'user');

  // First check all workspace-specific Maven executable settings
  for (const mvnExecutable of mvnExecutables.filter(mvnExecutable => mvnExecutable.scope === 'workspace')) {
    if (!(await checkMvnExecutable(mvnExecutable.value))) {
      logWarningMessage(
        l10n.t(
          'Invalid {0} Maven executable setting "{1}": "{2}"\nin workspace folder "{3}".\nThis is not a valid Maven executable with version {4}.\nKeeping this setting might lead to unexpected behavior.',
          localizeScope(mvnExecutable.scope),
          MAVEN_SETTING_KEY,
          mvnExecutable.value,
          mvnExecutable.workspaceFolder?.uri.fsPath ?? '',
          EXPECTED_MAVEN_VERSION
        )
      );
    } else {
      logInformationMessage(
        l10n.t(
          'Found valid {0} Maven executable setting "{1}": "{2}"\nin workspace folder "{3}".\nThis executable will be used for Maven operations in that workspace.',
          localizeScope(mvnExecutable.scope),
          MAVEN_SETTING_KEY,
          mvnExecutable.value,
          mvnExecutable.workspaceFolder?.uri.fsPath ?? ''
        )
      );
    }
  }

  // Next, check the user-specific Maven executable setting if present
  if (mvnExectuableUser) {
    if (!(await checkMvnExecutable(mvnExectuableUser.value))) {
      logWarningMessage(
        l10n.t(
          'Invalid {0} Maven executable setting "{1}": "{2}".\nThis is not a valid Maven executable with version {3}.\nKeeping this setting might lead to unexpected behavior.',
          localizeScope(mvnExectuableUser.scope),
          MAVEN_SETTING_KEY,
          mvnExectuableUser.value,
          EXPECTED_MAVEN_VERSION
        )
      );
    } else {
      logInformationMessage(
        l10n.t(
          'Found valid global {0} Maven executable setting "{1}": "{2}".\nThis executable will be used for Maven operations in folders where no Workspace/Folder Maven executable is configured.',
          localizeScope(mvnExectuableUser.scope),
          MAVEN_SETTING_KEY,
          mvnExectuableUser.value
        )
      );
    }
    return; // Stop further validation if a user-specific Maven executable is found and checked, no matter the validation outcome
  }

  // If there is no user-specific Maven executable, fall back to the default Maven executable on PATH
  const isValidPath = await checkMvnExecutable(DEFAULT_MAVEN_EXECUTABLE);
  if (!isValidPath) {
    logWarningMessage(
      l10n.t(
        'No valid Maven executable found.\nPlease ensure Maven {0} is installed and accessible in your PATH\nor the path to the executable is configured in your VS Code settings via "{1}".\nIgnoring this might lead to unexpected behavior.',
        EXPECTED_MAVEN_VERSION,
        MAVEN_SETTING_KEY
      )
    );
  }
};

const getMvnExecutables = () => {
  const mvnExecutables: MvnSettingExecutable[] = [];
  const wsFolders = workspace.workspaceFolders ?? [];

  // Retrieve Maven executable settings from each workspace folder, covers single and multi-root workspaces
  wsFolders.forEach(folder => {
    const mvnConfig = workspace.getConfiguration(MAVEN_SETTING_GROUP, folder.uri).inspect<string>(MAVEN_SETTING_EXECUTABLE_PATH);
    if (!mvnConfig) {
      return;
    }
    // Skip if neither workspace folder nor workspace value is set
    const val = mvnConfig.workspaceFolderValue ?? mvnConfig.workspaceValue;
    if (!val) {
      return;
    }
    mvnExecutables.push({
      scope: 'workspace',
      value: val,
      workspaceFolder: folder
    });
  });

  // Also retrieve the global user config value if present
  const userMvnConfig = workspace.getConfiguration(MAVEN_SETTING_GROUP).inspect<string>(MAVEN_SETTING_EXECUTABLE_PATH)?.globalValue;
  if (userMvnConfig) {
    mvnExecutables.push({ scope: 'user', value: userMvnConfig });
  }
  return mvnExecutables;
};

const checkMvnExecutable = async (executableRaw: string): Promise<boolean> => {
  try {
    const executable = executableRaw.trim();
    const executableQuoted = /\s/.test(executable) ? `"${executable}"` : executable;
    const command = [executableQuoted, '--version'].join(' ');
    const { stdout, stderr } = await execAsync(command, { encoding: 'utf8', windowsHide: true });
    const version = `${stdout}${stderr}`;
    return isExpectedMavenVersion(version);
  } catch (error) {
    console.log(`"${executableRaw}":`, error);
    return false;
  }
};

export const isExpectedMavenVersion = (versionOutput: string) => {
  return new RegExp(`Apache Maven ${EXPECTED_MAVEN_VERSION.replace('.', '\\.')}\\.\\d+(?:\\s|$)`).test(versionOutput);
};
