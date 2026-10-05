import { deTranslation, enTranslation } from '@axonivy/cms-editor';
import jaTranslation from '@axonivy/cms-editor/lib/translation/cms-editor/ja.json';
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
    ns: ['cms-editor'],
    defaultNS: 'cms-editor',
    resources: {
      de: { 'cms-editor': deTranslation },
      en: { 'cms-editor': enTranslation },
      ja: { 'cms-editor': jaTranslation }
    }
  });
};
