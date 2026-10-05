import { deTranslation, enTranslation } from '@axonivy/database-editor';
import jaTranslation from '@axonivy/database-editor/lib/translation/database-editor/ja.json';
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
    ns: ['database-editor'],
    defaultNS: 'database-editor',
    resources: {
      de: { 'database-editor': deTranslation },
      en: { 'database-editor': enTranslation },
      ja: { 'database-editor': jaTranslation }
    }
  });
};
