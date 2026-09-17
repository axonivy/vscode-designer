import { execFileSync } from 'child_process';
import fs from 'fs';
import { workspace } from 'vscode';
import { logInformationMessage } from './logging-util';

const MAVEN_SETTING_GROUP = 'maven';
const MAVEN_SETTING_EXECUTABLE_PATH = 'executable.path';
const MAVEN_SETTING_KEY = `${MAVEN_SETTING_GROUP}.${MAVEN_SETTING_EXECUTABLE_PATH}`;
const EXPECTED_MAVEN_VERSION = '3.9';

export const validateAndSyncMavenVersion = async () => {
  const mvnExecOverrides = getMvnExecutables();
  const mvnExecOverrideWorkspace = mvnExecOverrides.ws;
  const mvnExecOverrideUser = mvnExecOverrides.user;

  if (mvnExecOverrideWorkspace) {
    if (checkMvnExecutable(mvnExecOverrideWorkspace)) {
      const msg = `Found valid Workspace Maven executable setting "${MAVEN_SETTING_KEY}" = ${mvnExecOverrideWorkspace}.
      This Maven executable will be used.`;
      logInformationMessage(msg);
      return;
    } else {
      const msg = `Invalid Workspace Maven executable setting "${MAVEN_SETTING_KEY}". 
      ${mvnExecOverrideWorkspace} is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}. 
      Remove the setting from your Workspace configuration.`;
      throw new Error(msg);
    }
  }

  if (mvnExecOverrideUser) {
    if (checkMvnExecutable(mvnExecOverrideUser)) {
      const msg = `Found valid User Maven executable setting "${MAVEN_SETTING_KEY}" = ${mvnExecOverrideUser}.
      This Maven executable will be used.`;
      logInformationMessage(msg);
      return;
    } else {
      const msg = `Invalid User Maven executable setting "${MAVEN_SETTING_KEY}". 
      ${mvnExecOverrideUser} is not a valid Maven executable with version ${EXPECTED_MAVEN_VERSION}. 
      Remove the setting from your User configuration.`;
      throw new Error(msg);
    }
  }

  const isValidMvnPath = checkMvnExecutable();
  if (isValidMvnPath) {
    return; // silently return, default is to use the system Maven executable found on PATH
  }
  const msg = `No valid Maven executable found.
  Please ensure Maven ${EXPECTED_MAVEN_VERSION} is installed and accessible in your PATH
  or the path to the executable is configured in your VS Code settings via ${MAVEN_SETTING_KEY}.`;
  throw new Error(msg);
};

const getMvnExecutables = () => {
  const mvnConfig = workspace.getConfiguration(MAVEN_SETTING_GROUP);
  if (!mvnConfig) {
    return {
      ws: undefined,
      user: undefined
    };
  }
  const mvnOverrideWorkspace = mvnConfig.inspect<string>(MAVEN_SETTING_EXECUTABLE_PATH)?.workspaceValue;
  const mvnOverrideUser = mvnConfig.inspect<string>(MAVEN_SETTING_EXECUTABLE_PATH)?.globalValue;
  return {
    ws: mvnOverrideWorkspace,
    user: mvnOverrideUser
  };
};

const checkMvnExecutable = (pathToExecutable?: string) => {
  if (pathToExecutable) {
    if (!isExecutableFile(pathToExecutable)) {
      return false;
    }
    const version = execFileSync(pathToExecutable, ['--version'], { encoding: 'utf8', windowsHide: true });
    return isExpectedMavenVersion(version);
  }
  const version = execFileSync('mvn', ['--version'], { encoding: 'utf8', windowsHide: true });
  return isExpectedMavenVersion(version);
};

const isExecutableFile = (path: string): boolean => {
  try {
    return fs.statSync(path).isFile() && fs.accessSync(path, fs.constants.X_OK) === undefined;
  } catch {
    return false;
  }
};

const isExpectedMavenVersion = (versionOutput: string) => {
  return new RegExp(`Apache Maven ${EXPECTED_MAVEN_VERSION.replace('.', '\\.')}\\.\\d+(?:\\s|$)`).test(versionOutput);
};
