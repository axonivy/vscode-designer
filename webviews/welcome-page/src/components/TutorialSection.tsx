import { Flex } from '@axonivy/ui-components';
import { useTranslation } from 'react-i18next';
import { useVscode } from '../util/useVscode';
import { SectionButton } from './SectionButton';
import './TutorialSection.css';

export const TutorialSection = () => {
  const { t } = useTranslation();
  const { openUrl } = useVscode();

  return (
    <Flex direction='column' gap={4} style={{ width: '100%' }}>
      <Flex directon='row' justifyContent='space-between'>
        <h2>{t('Tutorials')}</h2>
        <SectionButton onClick={() => openUrl('https://www.axonivy.com/tutorials')}>Show all</SectionButton>
      </Flex>
      <div className='welcome-tutorial-container'>
        <iframe
          src='https://app.supademo.com/embed/cmb831mo700kh030ipho6i2tz?embed_v=2&utm_source=embed'
          className='welcome-tutorial-iframe'
          loading='lazy'
          title='Axon Ivy Visual Studio Code Extension 13.1'
          allow='clipboard-write'
          allowFullScreen
        ></iframe>
      </div>
    </Flex>
  );
};
