import { workspace } from 'vscode';
import { logWarningMessage } from './logging-util';

type SettingToCheck = { key: string; expectedType: 'boolean'; expectedValue: boolean };

const SETTINGS_TO_CHECK: SettingToCheck[] = [{ key: 'java.import.maven.enabled', expectedType: 'boolean', expectedValue: true }];

export const checkSettings = () => {
  SETTINGS_TO_CHECK.forEach(setting => {
    const settingEffective = workspace.getConfiguration().get<unknown>(setting.key);
    if (
      settingEffective !== undefined &&
      (typeof settingEffective !== setting.expectedType || settingEffective !== setting.expectedValue)
    ) {
      logWarningMessage(`Dangerous setting override found for setting "${setting.key}".
        Expected ${JSON.stringify(setting.expectedValue)} (${setting.expectedType}) but found ${JSON.stringify(settingEffective)} (${typeof settingEffective}).
        Remove the setting and reload the window to ensure the extension works correctly.`);
    }
  });
};
