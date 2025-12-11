import { Flex } from '@axonivy/ui-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NotificationType } from 'vscode-messenger-common';
import logo from '../axonivy-logo.svg';
import { useMessenger } from '../util/VscodeApiProvider';
import { CommandSection } from './CommandSection';
import { NewsSection } from './NewsSection';
import { ShortcutSection } from './shortcut/ShortcutSection';
import { ShowOnActivationToggle } from './ShowOnActivation';
import { SocialMediaLinkSection } from './SocialMediaLinkSection';
import { TutorialSection } from './TutorialSection';
import './WelcomePage.css';

const versionType: NotificationType<string> = { method: 'versionDelivered' };

export const WelcomePage = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState('');
  const { messenger } = useMessenger();

  messenger.onNotification(versionType, version => {
    setVersion(version);
  });

  return (
    <Flex justifyContent='center' className='welcome-page'>
      <Flex className='welcome-page-content' alignItems='center' direction='column' gap={4}>
        <Flex direction='column' gap={2} style={{ width: '100%' }}>
          <Flex direction='row' justifyContent='space-between'>
            <h1>{t('welcomePage.header')}</h1>
            <img className={'welcome-page-logo'} src={logo} />
          </Flex>
          <span className='welcome-page-version'>{`${t('version')} ${version ?? ''}`}</span>
        </Flex>
        <Flex direction='column' gap={4} style={{ width: '100%', height: '100%' }}>
          <div className='welcome-page-row'>
            <TutorialSection />
            <ShortcutSection />
          </div>
          <hr className='welcome-section-divider' />
          <div className='welcome-page-row'>
            <CommandSection />
            <NewsSection />
          </div>
        </Flex>
        <SocialMediaLinkSection />
        <ShowOnActivationToggle />
      </Flex>
    </Flex>
  );
};
