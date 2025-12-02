import { Button } from '@axonivy/ui-components';

export type SocialMedia = {
  name: string;
  icon: string;
  url: string;
  onClick: (value: string) => void;
};

export const SocialMediaLink = ({ name, icon, url, onClick }: SocialMedia) => {
  return (
    <Button className='welcome-socialmeda-btn' onClick={() => onClick(url)} key={name}>
      <img src={icon} className='welcome-socialmedia-icon' />
      <span className='welcome-socialmedia-name'>{name}</span>
    </Button>
  );
};
