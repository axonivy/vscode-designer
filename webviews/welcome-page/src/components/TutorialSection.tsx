import { Flex } from '@axonivy/ui-components';
import { useTranslation } from 'react-i18next';
import SPLASH from '../img/splash.png';
import { useVscode } from '../util/useVscode';
import { SectionButton } from './SectionButton';

export const TutorialSection = () => {
  const { t } = useTranslation();
  const { openUrl } = useVscode();

  return (
    <Flex direction='column' gap={4} className='w-full'>
      <Flex direction='row' justifyContent='space-between'>
        <h2 className='text-lg font-bold'>{t('label.tutorials')}</h2>
        <SectionButton onClick={() => openUrl('https://www.axonivy.com/tutorials')}>{t('welcomePage.showAll')}</SectionButton>
      </Flex>
      <img
        onClick={() => openUrl('https://app.supademo.com/demo/cmtik2kgn00d1tq0jvsxv9iri')}
        className='cursor-pointer rounded-lg border border-n200'
        src={SPLASH}
        alt='Tutorial Image'
      />
    </Flex>
  );
};
