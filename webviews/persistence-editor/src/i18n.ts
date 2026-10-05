import { deMessages, enMessages } from '@axonivy/persistence-editor';
import jaMessages from '@axonivy/persistence-editor/lib/translation/persistence-editor/ja.json';
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
    ns: ['persistence-editor'],
    defaultNS: 'persistence-editor',
    resources: {
      de: { 'persistence-editor': deMessages },
      en: { 'persistence-editor': enMessages },
      ja: { 'persistence-editor': jaMessages }
    }
  });
};
