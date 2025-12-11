import { Flex } from '@axonivy/ui-components';
import { useTranslation } from 'react-i18next';
import { useVscode } from '../util/useVscode';
import { SectionButton } from './SectionButton';

export const NewsSection = () => {
  const { t } = useTranslation();
  const { openUrl } = useVscode();
  return (
    <Flex direction='column' gap={4}>
      <Flex directon='row' justifyContent='space-between'>
        <h2>{t('News')}</h2>
        <SectionButton onClick={() => openUrl('https://www.axonivy.com/blog')}>Show all</SectionButton>
      </Flex>
      <Flex direction='row'>
        <div className='news-entry'>news entry place holder</div>
        <div className='news-entry'>news entry place holder</div>
        <div className='news-entry'>news entry place holder</div>
      </Flex>
    </Flex>
  );
};
