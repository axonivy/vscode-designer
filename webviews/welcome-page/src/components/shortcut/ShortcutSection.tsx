import { Flex } from '@axonivy/ui-components';
import { IvyIcons } from '@axonivy/ui-icons';
import { useTranslation } from 'react-i18next';
import { ShortcutCard, type Shortcut } from './Shortcut';
import { ShortcutOverview } from './ShortcutOverview';
import './ShortcutSection.css';

export const ShortcutSection = () => {
  const { t } = useTranslation();
  const gettingStarted: Shortcut = {
    title: t('shortcut.gettingStarted'),
    link: 'https://www.axonivy.com/tutorials',
    description: t('shortcut.gettingStartedDescription'),
    icon: IvyIcons.Help,
    oversize: true
  };

  return (
    <Flex className='shortcut-section' gap={4}>
      <Flex direction='column' className='shortcut-section' gap={4}>
        <h2>{t('shortcuts')}</h2>
        <Flex gap={3}>
          <ShortcutCard {...gettingStarted} />
          <ShortcutOverview />
        </Flex>
      </Flex>
    </Flex>
  );
};
