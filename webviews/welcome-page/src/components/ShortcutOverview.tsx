import { Flex } from '@axonivy/ui-components';
import { IvyIcons } from '@axonivy/ui-icons';
import { ShortcutCard, type Shortcut } from './Shortcut';

const shortcuts: Array<Shortcut> = [
  {
    title: 'Community',
    link: 'https://community.axonivy.com/',
    description: 'View our comunity inputs and add yours as you want',
    icon: IvyIcons.Comment
  },
  {
    title: 'Axon Ivy Market',
    link: 'https://market.axonivy.com/',
    description: 'Find powerful extensions for the Axon Ivy Platform',
    icon: IvyIcons.Market
  },
  {
    title: 'Documentation',
    link: 'https://dev.axonivy.com/doc',
    description: 'Learn all about the Axon Ivy Platform',
    icon: IvyIcons.File
  },
  {
    title: 'Getting started',
    link: 'https://www.axonivy.com/tutorials',
    description: 'Get started with the Axon ivy Platform',
    icon: IvyIcons.InfoCircle
  }
];

export const ShortcutOverview = () => {
  return (
    <Flex gap={4}>
      {shortcuts.map(s => (
        <ShortcutCard {...s} key={s.title} />
      ))}
    </Flex>
  );
};
