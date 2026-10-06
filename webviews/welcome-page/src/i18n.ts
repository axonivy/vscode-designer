import { getVscodeLanguage } from '@axonivy/vscode-webview-common';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import deTranslation from './translation/welcome-page/de.json';
import enTranslation from './translation/welcome-page/en.json';
import jaTranslation from './translation/welcome-page/ja.json';

export const initTranslation = () => {
  if (i18n.isInitializing || i18n.isInitialized) return;
  i18n.use(initReactI18next).init({
    debug: false,
    lng: getVscodeLanguage(),
    supportedLngs: ['de', 'en', 'ja'],
    fallbackLng: 'en',
    ns: ['welcome-page'],
    defaultNS: 'welcome-page',
    resources: {
      de: { 'welcome-page': deTranslation },
      en: { 'welcome-page': enTranslation },
      ja: { 'welcome-page': jaTranslation }
    }
  });
};
