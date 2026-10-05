import { deMessages, enMessages } from '@axonivy/form-editor';
import jaMessages from '@axonivy/form-editor/lib/translation/form-editor/ja.json';
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
    ns: ['form-editor'],
    defaultNS: 'form-editor',
    resources: {
      de: { 'form-editor': deMessages },
      en: { 'form-editor': enMessages },
      ja: { 'form-editor': jaMessages }
    }
  });
};
