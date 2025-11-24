import { Button, Flex } from '@axonivy/ui-components';
import { useVscode } from '../util/useVscode';
import './SocialMediaLinks.css';
import facebookLogo from './socialMediaIcons/facebook.svg';
import gitHubLogo from './socialMediaIcons/github.svg';
import ivyLogo from './socialMediaIcons/ivy.svg';
import linkedInLogo from './socialMediaIcons/linkedin.svg';
import xingLogo from './socialMediaIcons/xing.svg';
import youTubeLogo from './socialMediaIcons/youtube.svg';

type SocialMedia = {
  icon: string;
  name: string;
  url: string;
};

const socialMedias: Array<SocialMedia> = [
  {
    name: 'GitHub',
    icon: gitHubLogo,
    url: 'https://github.com/axonivy/'
  },
  {
    name: 'LinkedIn',
    icon: linkedInLogo,
    url: 'https://www.linkedin.com/company/axonivy'
  },
  {
    name: 'Xing',
    icon: xingLogo,
    url: 'https://www.xing.com/pages/axonivyag'
  },
  {
    name: 'YouTube',
    icon: youTubeLogo,
    url: 'https://www.youtube.com/channel/UCkoNcDoeDAVM7FB-txy3jnQ'
  },

  {
    name: 'Facebook',
    icon: facebookLogo,
    url: 'https://www.facebook.com/axonivy/'
  },

  {
    name: 'Axon Ivy',
    icon: ivyLogo,
    url: 'https://www.axonivy.com/'
  }
];

export const SocialMediaLinks = () => {
  const { openUrl } = useVscode();
  return (
    <Flex direction='row' justifyContent='flex-end' style={{ width: '100%' }}>
      <Flex className='welcome-socialmedia-wrapper' direction='row'>
        {socialMedias.map(s => (
          <Button className='welcome-socialmeda-btn' onClick={() => openUrl(s.url)} key={s.name}>
            <img src={s.icon} className='welcome-socialmedia-icon' />
            <span className='welcome-socialmedia-name'>{s.name}</span>
          </Button>
        ))}
      </Flex>
    </Flex>
  );
};
