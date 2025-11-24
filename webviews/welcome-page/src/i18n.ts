import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './translation/welcome-page/en.json';

export const initTranslation = () => {
  if (i18n.isInitializing || i18n.isInitialized) return;
  i18n.use(initReactI18next).init({
    debug: true,
    supportedLngs: ['en'],
    fallbackLng: 'en',
    ns: ['welcome-page'],
    defaultNS: 'welcome-page',
    resources: { en: { 'welcome-page': enTranslation } }
  });
};
