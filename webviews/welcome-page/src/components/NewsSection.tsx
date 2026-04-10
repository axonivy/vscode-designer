import { Flex } from '@axonivy/ui-components';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { FeedStore, type NewsItem } from '../util/FeedStore';
import { useVscode } from '../util/useVscode';
import { SectionButton } from './SectionButton';

export const NewsSection = () => {
  const { t } = useTranslation();
  const { openUrl } = useVscode();

  return (
    <Flex direction='column' gap={4} className='h-full'>
      <Flex direction='row' justifyContent='space-between'>
        <h2 className='text-lg font-bold'>{t('News')}</h2>
        <SectionButton onClick={() => openUrl('https://www.axonivy.com/blog')}>{t('welcomePage.showAll')}</SectionButton>
      </Flex>
      <div className='grid h-full grid-cols-3 gap-3'>
        <Feed />
      </div>
    </Flex>
  );
};

const Feed = () => {
  const { t } = useTranslation();
  const feed = useSyncExternalStore(FeedStore.subscribe, FeedStore.getFeed);
  if (!feed) {
    return <span>{t('welcomePage.noNewsToShow')}</span>;
  }
  return feed.items.slice(0, 3).map(entry => {
    return <NewsEntry key={entry.title} entry={entry} />;
  });
};

const NewsEntry = ({ entry }: { entry: NewsItem }) => {
  const { openUrl } = useVscode();
  return (
    <button
      onClick={() => openUrl(entry.link)}
      className='flex h-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-n200 bg-n50 p-5 text-sm hover:bg-n100'
    >
      <Flex direction='column' gap={2} className='h-full justify-between text-start'>
        <h3>{entry.title}</h3>
        <span className='line-clamp-4 text-n900'>{entry.contentSnippet}</span>
      </Flex>
    </button>
  );
};
