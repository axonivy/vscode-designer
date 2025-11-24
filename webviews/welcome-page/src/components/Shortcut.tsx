import { Flex, IvyIcon } from '@axonivy/ui-components';
import { IvyIcons } from '@axonivy/ui-icons';

import { useWebsite } from '../util/useWebsite';
import './Shortcut.css';

export type Shortcut = { title: string; icon: IvyIcons; link: string; description: string };

export const ShortcutCard = ({ title, icon, link, description }: Shortcut) => {
  const { openUrl } = useWebsite();
  return (
    <Flex
      className='welcome-shortcut-card'
      justifyContent='space-between'
      alignItems='center'
      direction='column'
      onClick={() => openUrl(link)}
    >
      <IvyIcon className='welcome-shortcut-icon' icon={icon} />
      <h3>{title}</h3>
      <span className='welcome-shortcut-description'>{description}</span>
    </Flex>
  );
};
