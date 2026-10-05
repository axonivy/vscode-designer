import { deTranslation, enTranslation } from '@axonivy/dataclass-editor';
import jaTranslation from '@axonivy/dataclass-editor/lib/translation/dataclass-editor/ja.json';
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
    ns: ['dataclass-editor'],
    defaultNS: 'dataclass-editor',
    resources: {
      de: { 'dataclass-editor': deTranslation },
      en: { 'dataclass-editor': enTranslation },
      ja: { 'dataclass-editor': jaTranslation }
    }
  });
};
