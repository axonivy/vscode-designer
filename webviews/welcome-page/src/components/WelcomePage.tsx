import { Flex, Separator } from '@axonivy/ui-components';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../axonivy-logo.svg';
import { VersionStore } from '../util/VersionStore';
import { CommandSection } from './CommandSection';
import { NewsSection } from './NewsSection';
import { ShortcutSection } from './shortcut/ShortcutSection';
import { ShowOnActivationToggle } from './ShowOnActivation';
import { SocialMediaLinkSection } from './SocialMediaLinkSection';
import { TutorialSection } from './TutorialSection';

export const WelcomePage = () => {
  const { t } = useTranslation();
  const version = useSyncExternalStore(VersionStore.subscribe, VersionStore.getVersion);

  return (
    <Flex justifyContent='center' className='size-full bg-background'>
      <Flex className='h-full w-[clamp(1000px,1500px,100%)] p-5' alignItems='center' direction='column' gap={4}>
        <Flex direction='column' gap={2} className='w-full'>
          <Flex direction='row' justifyContent='space-between'>
            <h1 className='text-2xl font-bold'>{t('welcomePage.header')}</h1>
            <img className='w-37.5 dark:invert' src={logo} />
          </Flex>
          <span className='text-base font-bold text-n800'>{`${t('version')} ${version ?? ''}`}</span>
        </Flex>
        <Flex direction='column' gap={4} className='size-full'>
          <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
            <TutorialSection />
            <ShortcutSection />
          </div>
          <Separator className='m-0!' />
          <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
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
