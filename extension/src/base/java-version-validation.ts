import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { logErrorMessage, logInformationMessage } from './logging-util';

const EXPECTED_JAVA_VERSION = '25';

export const validateAndSyncJavaVersion = async () => {
  const javaHome = process.env.IVY_JAVA_HOME ?? process.env.JAVA_HOME;
  if (!javaHome) {
    const message = `JAVA_HOME is not set. Please set JAVA_HOME or IVY_JAVA_HOME environment variable to a valid Java ${EXPECTED_JAVA_VERSION} installation path.`;
    logErrorMessage(message);
    throw new Error(message);
  }
  if (!isValidJavaVersion(javaHome)) {
    const message = `Wrong Java version detected under ${javaHome}. Expected Java ${EXPECTED_JAVA_VERSION}.`;
    logErrorMessage(message);
    throw new Error(message);
  }
  const jdtJavaHome = vscode.workspace.getConfiguration().get<string>('java.jdt.ls.java.home');
  if (jdtJavaHome === javaHome) {
    return;
  }
  if (!jdtJavaHome || !isValidJavaVersion(jdtJavaHome)) {
    logInformationMessage("Updating 'java.jdt.ls.java.home' to match JAVA_HOME and restarting extension host...");
    await vscode.workspace.getConfiguration().update('java.jdt.ls.java.home', javaHome, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
  }
};

const isValidJavaVersion = (javaHome: string) => {
  const releasePath = path.join(javaHome, 'release');
  try {
    const releaseContent = fs.readFileSync(releasePath, 'utf8');
    const javaVersion = releaseContent.split('\n').find(line => line.startsWith('JAVA_VERSION='));
    return javaVersion?.startsWith(`JAVA_VERSION="${EXPECTED_JAVA_VERSION}.`);
  } catch {
    return false;
  }
};
