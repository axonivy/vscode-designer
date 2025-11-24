import { Flex } from '@axonivy/ui-components';
import { useTranslation } from 'react-i18next';
import { ShortcutCard } from './Shortcut';
import { ShortcutOverview } from './ShortcutOverview';
import './ShortcutSection.css';
import { useShortcuts } from './useShortcuts';

export const ShortcutSection = () => {
  const { t } = useTranslation();
  const { shortcuts, gettingStartedShortcut } = useShortcuts();

  return (
    <Flex className='shortcut-section' gap={4}>
      <Flex direction='column' gap={4} style={{ width: '100%' }}>
        <h2>{t('shortcuts')}</h2>
        <div className='shortcut-section-grid'>
          <ShortcutCard {...gettingStartedShortcut} />
          <ShortcutOverview shortcuts={shortcuts} columns={2} />
        </div>
      </Flex>
    </Flex>
  );
};
