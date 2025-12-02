import { Flex } from '@axonivy/ui-components';
import { IvyIcons } from '@axonivy/ui-icons';
import { useTranslation } from 'react-i18next';
import { useVscode } from '../../util/useVscode';
import { ShortcutCard } from './Shortcut';
import './ShortcutSection.css';

export const ShortcutSection = () => {
  const { t } = useTranslation();
  const { openUrl } = useVscode();

  return (
    <Flex className='shortcut-section' gap={4}>
      <Flex direction='column' gap={4} style={{ width: '100%' }}>
        <h2>{t('shortcuts')}</h2>
        <div className='shortcut-grid'>
          <ShortcutCard
            title={t('shortcut.gettingStarted')}
            value={'https://www.axonivy.com/tutorials'}
            description={t('shortcut.gettingStartedDescription')}
            icon={IvyIcons.Help}
            oversize={true}
            onClick={openUrl}
          />
          <div className='shortcut-grid'>
            <ShortcutCard
              title={t('shortcut.documentation')}
              value={'https://dev.axonivy.com/doc'}
              description={t('shortcut.documentationDescription')}
              icon={IvyIcons.File}
              onClick={openUrl}
            />
            <ShortcutCard
              title={t('shortcut.market')}
              value={'https://market.axonivy.com/'}
              description={t('shortcut.marketDescription')}
              icon={IvyIcons.Market}
              onClick={openUrl}
            />
            <ShortcutCard
              title={t('shortcut.community')}
              value={'https://community.axonivy.com/'}
              description={t('shortcut.communityDescription')}
              icon={IvyIcons.Comment}
              onClick={openUrl}
            />
            <ShortcutCard
              title={t('shortcut.news')}
              value={'https://dev.axonivy.com/news'}
              description={t('shortcut.newsDescription')}
              icon={IvyIcons.InfoCircle}
              onClick={openUrl}
            />
          </div>
        </div>
      </Flex>
    </Flex>
  );
};
