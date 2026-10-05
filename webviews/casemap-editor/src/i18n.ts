import { deTranslation, enTranslation } from '@axonivy/case-map-editor';
import jaTranslation from '@axonivy/case-map-editor/lib/translation/case-map-editor/ja.json';
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
    ns: ['case-map-editor'],
    defaultNS: 'case-map-editor',
    resources: {
      de: { 'case-map-editor': deTranslation },
      en: { 'case-map-editor': enTranslation },
      ja: { 'case-map-editor': jaTranslation }
    }
  });
};
