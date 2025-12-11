import { Flex } from '@axonivy/ui-components';
import { useTranslation } from 'react-i18next';
import { useVscode } from '../util/useVscode';
import { SectionButton } from './SectionButton';
import tutorialImage from './tutorial_thumbnail.png';
import './TutorialSection.css';

export const TutorialSection = () => {
  const { t } = useTranslation();
  const { openUrl } = useVscode();

  return (
    <Flex direction='column' gap={4} style={{ width: '100%' }}>
      <Flex directon='row' justifyContent='space-between'>
        <h2>{t('Tutorials')}</h2>
        <SectionButton onClick={() => openUrl('https://www.axonivy.com/tutorials')}>{t('welcomePage.showAll')}</SectionButton>
      </Flex>
      <img
        onClick={() => openUrl('https://app.supademo.com/demo/cmj6v0sta00y20b0ifs1jg53x')}
        className='tutorial-thumbnail'
        src={tutorialImage}
        alt='Tutorial Image'
      />
    </Flex>
  );
};
