import { Flex } from '@axonivy/ui-components';
import { useTranslation } from 'react-i18next';
import { ShortcutOverview } from './shortcut/ShortcutOverview';
import { useShortcuts } from './shortcut/useShortcuts';

export const GettingStartedCommands = () => {
  const { t } = useTranslation();
  const { commandShortcuts } = useShortcuts();
  return (
    <Flex direction='column' className='command-section' gap={4} style={{ width: '100%' }}>
      <h2>{t('commandsSection')}</h2>
      <ShortcutOverview shortcuts={commandShortcuts} columns={4} />
    </Flex>
  );
};
