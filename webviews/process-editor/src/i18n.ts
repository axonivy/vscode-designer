import { deTranslation, enTranslation } from '@axonivy/process-editor';
import jaTranslation from '@axonivy/process-editor/lib/translation/process-editor/ja.json';
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
    ns: ['process-editor'],
    defaultNS: 'process-editor',
    resources: {
      de: { 'process-editor': deTranslation },
      en: { 'process-editor': enTranslation },
      ja: { 'process-editor': jaTranslation }
    }
  });
};
