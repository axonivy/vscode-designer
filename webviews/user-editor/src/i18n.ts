import { deMessages, enMessages } from '@axonivy/user-editor';
import jaMessages from '@axonivy/user-editor/lib/translation/user-editor/ja.json';
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
    ns: ['user-editor'],
    defaultNS: 'user-editor',
    resources: {
      de: { 'user-editor': deMessages },
      en: { 'user-editor': enMessages },
      ja: { 'user-editor': jaMessages }
    }
  });
};
