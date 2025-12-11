import { Flex } from '@axonivy/ui-components';
import { useTranslation } from 'react-i18next';
import { useVscode } from '../util/useVscode';
import { SectionButton } from './SectionButton';
import './TutorialSection.css';

const IMG_URL = 'https://raw.githubusercontent.com/axonivy/vscode-designer/refs/heads/master/doc/image/tutorial_thumbnail.png';

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
        src={IMG_URL}
        alt='Tutorial Image'
      />
    </Flex>
  );
};
