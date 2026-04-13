import { Button } from '@axonivy/ui-components';

export type SocialMedia = {
  name: string;
  icon: string;
  url: string;
  onClick: (value: string) => void;
};

export const SocialMediaLink = ({ name, icon, url, onClick }: SocialMedia) => {
  return (
    <Button
      className='rounded-none! border-r! border-r-n200! last:border-r-0! hover:[&_span]:w-20!'
      onClick={() => onClick(url)}
      key={name}
    >
      <img alt={name} aria-hidden className='w-3.75 dark:invert' src={icon} />
      <span className='w-0 overflow-hidden whitespace-nowrap transition-[width] duration-400'>{name}</span>
    </Button>
  );
};
