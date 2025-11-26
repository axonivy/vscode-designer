import { IvyIcons } from '@axonivy/ui-icons';
import { useTranslation } from 'react-i18next';
import { ShortcutCard, type Shortcut } from './Shortcut';
import './ShortcutOverview.css';

export const ShortcutOverview = () => {
  const { t } = useTranslation();
  const shortcuts: Array<Shortcut> = [
    {
      title: t('shortcut.documentation'),
      link: 'https://dev.axonivy.com/doc',
      description: t('shortcut.documentationDescription'),
      icon: IvyIcons.File
    },
    {
      title: t('shortcut.market'),
      link: 'https://market.axonivy.com/',
      description: t('shortcut.marketDescription'),
      icon: IvyIcons.Market
    },
    {
      title: t('shortcut.community'),
      link: 'https://community.axonivy.com/',
      description: t('shortcut.communityDescription'),
      icon: IvyIcons.Comment
    },
    {
      title: t('shortcut.news'),
      link: 'https://dev.axonivy.com/news',
      description: t('shortcut.newsDescription'),
      icon: IvyIcons.InfoCircle
    }
  ];

  return (
    <div className='shortcut-grid'>
      {shortcuts.map(s => (
        <ShortcutCard {...s} key={s.title} />
      ))}
    </div>
  );
};
