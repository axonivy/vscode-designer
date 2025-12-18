import { Button, Flex } from '@axonivy/ui-components';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { FeedStore, type NewsItem } from '../util/FeedStore';
import { useVscode } from '../util/useVscode';
import './NewsSection.css';
import { SectionButton } from './SectionButton';

export const NewsSection = () => {
  const { t } = useTranslation();
  const { openUrl } = useVscode();

  const feed = useSyncExternalStore(FeedStore.subscribe, FeedStore.getFeed);

  const generateFeed = () => {
    if (!feed) {
      return <span>{t('welcomePage.noNewsToShow')}</span>;
    }
    return feed.items.slice(0, 3).map(entry => {
      return <NewsEntry key={entry.title} entry={entry} />;
    });
  };

  return (
    <Flex direction='column' gap={4} style={{ height: '100%' }}>
      <Flex directon='row' justifyContent='space-between'>
        <h2>{t('News')}</h2>
        <SectionButton onClick={() => openUrl('https://www.axonivy.com/blog')}>{t('welcomePage.showAll')}</SectionButton>
      </Flex>
      <div className='welcome-news-grid'>{generateFeed()}</div>
    </Flex>
  );
};

const NewsEntry = ({ entry }: { entry: NewsItem }) => {
  const { openUrl } = useVscode();
  return (
    <Button onClick={() => openUrl(entry.link)} className='welcome-news-entry'>
      <Flex direction='column' gap={2} className='welcome-page-news-flex'>
        <h3>{entry.title}</h3>
        <span className='welcome-news-entry-text'>{entry.contentSnippet}</span>
      </Flex>
    </Button>
  );
};
