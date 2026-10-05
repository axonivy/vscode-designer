import { l10n, workspace } from 'vscode';
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
      logWarningMessage(
        l10n.t(
          'Dangerous setting override found for setting "{0}".\nExpected {1} ({2}) but found {3} ({4}).\nRemove the setting and reload the window to ensure the extension works correctly.',
          setting.key,
          JSON.stringify(setting.expectedValue),
          setting.expectedType,
          JSON.stringify(settingEffective),
          typeof settingEffective
        )
      );
    }
  });
};
