import fs from 'fs';
import path from 'path';
import { commands, ConfigurationTarget, l10n, workspace } from 'vscode';
import { logErrorMessage, logInformationMessage } from './logging-util';

const EXPECTED_JAVA_VERSION = '25';

export const validateAndSyncJavaVersion = async () => {
  const javaHome = process.env.IVY_JAVA_HOME ?? process.env.JAVA_HOME;
  const jdtJavaHome = workspace.getConfiguration().get<string>('java.jdt.ls.java.home');
  const isValidJavaHome = isValidJavaVersion(javaHome);
  const isValidJdtJavaHome = isValidJavaVersion(jdtJavaHome);
  if (!isValidJavaHome && !isValidJdtJavaHome) {
    const message = l10n.t(
      "No valid Java found under JAVA_HOME={0} or java.jdt.ls.java.home={1}.\nEither set env variable JAVA_HOME to valid Java {2} installation path,\nor configure VS Code setting 'java.jdt.ls.java.home'.",
      String(javaHome),
      String(jdtJavaHome),
      EXPECTED_JAVA_VERSION
    );
    logErrorMessage(message);
    throw new Error(message);
  }
  if (!isValidJavaHome) {
    process.env.IVY_JAVA_HOME = jdtJavaHome; // will be used for engine start
    return;
  }
  if (!isValidJdtJavaHome) {
    logInformationMessage(l10n.t("Updating 'java.jdt.ls.java.home' to match JAVA_HOME and restarting extension host..."));
    await workspace.getConfiguration().update('java.jdt.ls.java.home', javaHome, ConfigurationTarget.Global);
    await commands.executeCommand('workbench.action.reloadWindow');
  }
};

const isValidJavaVersion = (javaHome?: string) => {
  if (!javaHome) {
    return false;
  }
  const releasePath = path.join(javaHome, 'release');
  try {
    const releaseContent = fs.readFileSync(releasePath, 'utf8');
    const javaVersion = releaseContent.split('\n').find(line => line.startsWith('JAVA_VERSION='));
    return javaVersion?.startsWith(`JAVA_VERSION="${EXPECTED_JAVA_VERSION}`);
  } catch {
    return false;
  }
};
