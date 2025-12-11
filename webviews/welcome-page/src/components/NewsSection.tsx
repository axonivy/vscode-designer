import { Button, Flex } from '@axonivy/ui-components';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NotificationType } from 'vscode-messenger-common';
import { useVscode } from '../util/useVscode';
import { useMessenger } from '../util/VscodeApiProvider';
import './NewsSection.css';
import { SectionButton } from './SectionButton';

const newsFeedType: NotificationType<NewsFeed> = { method: 'newsFeed' };

type NewsFeed = {
  description: string;
  items: Array<NewsItem>;
};

type NewsItem = {
  title: string;
  pubDate: string;
  contentSnippet: string;
  link: string;
};

export const NewsSection = () => {
  const { t } = useTranslation();
  const { openUrl } = useVscode();

  const [feed, setFeed] = useState<NewsFeed>();
  const { messenger } = useMessenger();
  messenger.onNotification(newsFeedType, setFeed);

  useEffect(() => console.log(feed), [feed]);

  return (
    <Flex direction='column' gap={4} style={{ height: '100%' }}>
      <Flex directon='row' justifyContent='space-between'>
        <h2>{t('News')}</h2>
        <SectionButton onClick={() => openUrl('https://www.axonivy.com/blog')}>{t('welcomePage.showAll')}</SectionButton>
      </Flex>
      <div className='welcome-news-grid'>
        {feed &&
          feed.items.map((entry, i) => {
            if (i >= 3) return;
            return <NewsEntry key={entry.title} entry={entry} />;
          })}
      </div>
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
