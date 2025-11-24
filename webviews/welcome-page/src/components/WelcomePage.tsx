import { cn, Flex, useTheme } from '@axonivy/ui-components';
import { useTranslation } from 'react-i18next';
import logo from '../axonivy-logo.svg';
import { ShortcutOverview } from './ShortcutOverview';
import './WelcomePage.css';

export const WelcomePage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  console.log(theme.realTheme);
  return (
    <Flex className='welcome-page-content' direction='column'>
      <Flex direction='row' justifyContent='space-between'>
        <h1>{t('welcomeToProDesigner')}</h1>
        <img className={cn('welcome-page-logo', theme.realTheme === 'dark' && 'logo-light')} src={logo} />
      </Flex>
      <ShortcutOverview />
    </Flex>
  );
};
