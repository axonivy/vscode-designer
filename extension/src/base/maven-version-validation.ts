import { execFileSync } from 'child_process';
import { workspace, type WorkspaceFolder } from 'vscode';
import { logInformationMessage, logWarningMessage } from './logging-util';

const DEFAULT_MAVEN_EXECUTABLE = 'mvn';
const MAVEN_SETTING_GROUP = 'maven';
const MAVEN_SETTING_EXECUTABLE_PATH = 'executable.path';
export const MAVEN_SETTING_KEY = `${MAVEN_SETTING_GROUP}.${MAVEN_SETTING_EXECUTABLE_PATH}`;
const EXPECTED_MAVEN_VERSION = '3.9';

export type MvnSettingExecutable = {
  scope: 'workspace' | 'user';
  value: string;
  workspaceFolder?: WorkspaceFolder;
};

export const validateMavenExecutable = () => {
  const mvnExecutables = getMvnExecutables();
  const mvnExectuableUser = mvnExecutables.find(mvnExecutable => mvnExecutable.scope === 'user');

  // First check all workspace-specific Maven executable settings
  mvnExecutables
    .filter(mvnExecutable => mvnExecutable.scope === 'workspace')
    .forEach(mvnExecutable => {
      if (!checkMvnExecutable(mvnExecutable.value)) {
        logWarningMessage(`Invalid ${mvnExecutable.scope} Maven executable setting "${MAVEN_SETTING_KEY}": "${mvnExecutable.value}"
        in workspace folder "${mvnExecutable.workspaceFolder?.uri.fsPath}".
        This is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}.
        Keeping this setting might lead to unexpected behavior.`);
      } else {
        logInformationMessage(`Found valid ${mvnExecutable.scope} Maven executable setting "${MAVEN_SETTING_KEY}": "${mvnExecutable.value}"
        in workspace folder "${mvnExecutable.workspaceFolder?.uri.fsPath}".
        This executable will be used for Maven operations in that workspace.`);
      }
    });

  // Next, check the user-specific Maven executable setting if present
  if (mvnExectuableUser) {
    if (!checkMvnExecutable(mvnExectuableUser.value)) {
      logWarningMessage(`Invalid ${mvnExectuableUser.scope} Maven executable setting "${MAVEN_SETTING_KEY}": "${mvnExectuableUser.value}".
        This is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}.
        Keeping this setting might lead to unexpected behavior.`);
    } else {
      logInformationMessage(`Found valid global ${mvnExectuableUser.scope} Maven executable setting "${MAVEN_SETTING_KEY}": "${mvnExectuableUser.value}".
      This executable will be used for Maven operations in folders where no Workspace/Folder Maven executable is configured.`);
    }
    return; // Stop further validation if a user-specific Maven executable is found and checked, no matter the validation outcome
  }

  // If there is no user-specific Maven executable, fall back to the default Maven executable on PATH
  const isValidPath = checkMvnExecutable(DEFAULT_MAVEN_EXECUTABLE);
  if (!isValidPath) {
    logWarningMessage(`No valid Maven executable found.
    Please ensure Maven ${EXPECTED_MAVEN_VERSION} is installed and accessible in your PATH
    or the path to the executable is configured in your VS Code settings via "${MAVEN_SETTING_KEY}".
    Ignoring this might lead to unexpected behavior.`);
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

const checkMvnExecutable = (executable: string) => {
  console.log(`Checking Maven executable: "${executable}"`);

  const isWindows = process.platform === 'win32';
  console.log('process.platform:', process.platform);
  console.log('isWindows:', isWindows);

  try {
    let version;
    if (isWindows) {
      console.log('Detected Windows platform');
      version = execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `"${executable}" --version`], {
        encoding: 'utf8',
        windowsHide: true
      });
    } else {
      console.log('Detected non-Windows platform');
      version = execFileSync(executable, ['--version'], { encoding: 'utf8', windowsHide: true });
    }

    // const version = execFileSync(executable, ['--version'], { encoding: 'utf8', windowsHide: true });

    return isExpectedMavenVersion(version);
  } catch (error) {
    console.log(`Failed to check Maven executable "${executable}":`, error);
    return false;
  }
};

const isExpectedMavenVersion = (versionOutput: string) => {
  return new RegExp(`Apache Maven ${EXPECTED_MAVEN_VERSION.replace('.', '\\.')}\\.\\d+(?:\\s|$)`).test(versionOutput);
};
