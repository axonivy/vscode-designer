import { deMessages, enMessages } from '@axonivy/role-editor';
import jaMessages from '@axonivy/role-editor/lib/translation/role-editor/ja.json';
import { getVscodeLanguage } from '@axonivy/vscode-webview-common';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const initTranslation = () => {
  if (i18n.isInitializing || i18n.isInitialized) return;
  i18n.use(initReactI18next).init({
    debug: false,
    lng: getVscodeLanguage(),
    supportedLngs: ['de', 'en', 'ja'],
    fallbackLng: 'en',
    ns: ['role-editor'],
    defaultNS: 'role-editor',
    resources: {
      de: { 'role-editor': deMessages },
      en: { 'role-editor': enMessages },
      ja: { 'role-editor': jaMessages }
    }
  });
};
