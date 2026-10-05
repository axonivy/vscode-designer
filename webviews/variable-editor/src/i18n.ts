import { deTranslation, enTranslation } from '@axonivy/variable-editor';
import jaTranslation from '@axonivy/variable-editor/lib/translation/variable-editor/ja.json';
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
    ns: ['variable-editor'],
    defaultNS: 'variable-editor',
    resources: {
      de: { 'variable-editor': deTranslation },
      en: { 'variable-editor': enTranslation },
      ja: { 'variable-editor': jaTranslation }
    }
  });
};
