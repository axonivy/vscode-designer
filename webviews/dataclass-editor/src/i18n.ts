import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enTranslation } from '@axonivy/dataclass-editor';

export const initTranslation = () => {
  if (i18n.isInitializing || i18n.isInitialized) return;
  i18n.use(initReactI18next).init({
    debug: true,
    supportedLngs: ['en'],
    fallbackLng: 'en',
    ns: ['dataclass-editor'],
    defaultNS: 'dataclass-editor',
    resources: { en: { 'dataclass-editor': enTranslation } }
  });
};
