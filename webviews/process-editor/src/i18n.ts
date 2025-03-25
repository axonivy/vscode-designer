import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enTranslation, enCommonTranslation } from '@axonivy/process-editor';

export const initTranslation = () => {
  if (i18n.isInitializing || i18n.isInitialized) return;
  i18n.use(initReactI18next).init({
    debug: true,
    supportedLngs: ['en'],
    fallbackLng: 'en',
    ns: ['process-editor'],
    defaultNS: 'process-editor',
    resources: { en: { 'process-editor': enTranslation, common: enCommonTranslation } }
  });
};
