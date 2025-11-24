import { cn, Flex } from '@axonivy/ui-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../axonivy-logo.svg';
import { useVscode } from '../util/useVscode';
import { GettingStartedCommands } from './GettingStartedCommands';
import { ShortcutSection } from './shortcut/ShortcutSection';
import { SocialMediaLinks } from './SocialMediaLinks';
import './WelcomePage.css';

export const WelcomePage = () => {
  const { t } = useTranslation();
  const [initData, setInitData] = useState({ version: '' });
  const { getData } = useVscode();
  getData(setInitData);

  return (
    <Flex justifyContent='center' className='welcome-page'>
      <Flex className='welcome-page-content' alignItems='center' direction='column' gap={4}>
        <Flex direction='column' gap={2} style={{ width: '100%' }}>
          <Flex direction='row' justifyContent='space-between'>
            <h1>{t('welcomeToProDesigner')}</h1>
            <img className={cn('welcome-page-logo', document.body.getAttribute('color-scheme') == 'dark')} src={logo} />
          </Flex>
          <span className='welcome-page-version'>{`${t('version')} ${initData['version'] ?? ''}`}</span>
        </Flex>
        <Flex direction='column' gap={4} style={{ width: '100%', height: '100%' }}>
          <ShortcutSection />
          <GettingStartedCommands />
        </Flex>
        <SocialMediaLinks />
      </Flex>
    </Flex>
  );
};
