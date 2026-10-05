import { deMessages, enMessages } from '@axonivy/restclient-editor';
import jaMessages from '@axonivy/restclient-editor/lib/translation/restclient-editor/ja.json';
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
    ns: ['restclient-editor'],
    defaultNS: 'restclient-editor',
    resources: {
      de: { 'restclient-editor': deMessages },
      en: { 'restclient-editor': enMessages },
      ja: { 'restclient-editor': jaMessages }
    }
  });
};
