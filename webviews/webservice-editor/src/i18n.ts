import { deMessages, enMessages } from '@axonivy/webservice-editor';
import jaMessages from '@axonivy/webservice-editor/lib/translation/webservice-editor/ja.json';
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
    ns: ['webservice-editor'],
    defaultNS: 'webservice-editor',
    resources: {
      de: { 'webservice-editor': deMessages },
      en: { 'webservice-editor': enMessages },
      ja: { 'webservice-editor': jaMessages }
    }
  });
};
