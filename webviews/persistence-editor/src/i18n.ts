import { enMessages } from '@axonivy/persistence-editor';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const initTranslation = () => {
  if (i18n.isInitializing || i18n.isInitialized) return;
  i18n.use(initReactI18next).init({
    debug: true,
    supportedLngs: ['en'],
    fallbackLng: 'en',
    ns: ['persistence-editor'],
    defaultNS: 'persistence-editor',
    resources: { en: { 'persistence-editor': enMessages } }
  });
};
