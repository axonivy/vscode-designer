/* eslint-disable i18next/no-literal-string */
import { Flex } from '@axonivy/ui-components';
import { useVscode } from '../util/useVscode';
import { SocialMediaLink } from './SocialMediaLink';
import './SocialMediaLinkSection.css';
import facebookLogo from './socialMediaIcons/facebook.svg';
import gitHubLogo from './socialMediaIcons/github.svg';
import ivyLogo from './socialMediaIcons/ivy.svg';
import linkedInLogo from './socialMediaIcons/linkedin.svg';
import xingLogo from './socialMediaIcons/xing.svg';
import youTubeLogo from './socialMediaIcons/youtube.svg';

export const SocialMediaLinkSection = () => {
  const { openUrl } = useVscode();
  return (
    <Flex direction='row' justifyContent='flex-end' style={{ width: '100%' }}>
      <Flex className='welcome-socialmedia-wrapper' direction='row'>
        <SocialMediaLink name={'GitHub'} icon={gitHubLogo} url={'https://github.com/axonivy/'} onClick={openUrl} />
        <SocialMediaLink name={'LinkedIn'} icon={linkedInLogo} url={'https://www.linkedin.com/company/axonivy'} onClick={openUrl} />
        <SocialMediaLink name={'Xing'} icon={xingLogo} url={'https://www.xing.com/pages/axonivyag'} onClick={openUrl} />
        <SocialMediaLink
          name={'YouTube'}
          icon={youTubeLogo}
          url={'https://www.youtube.com/channel/UCkoNcDoeDAVM7FB-txy3jnQ'}
          onClick={openUrl}
        />
        <SocialMediaLink name={'Facebook'} icon={facebookLogo} url={'https://www.facebook.com/axonivy/'} onClick={openUrl} />
        <SocialMediaLink name={'Axon Ivy'} icon={ivyLogo} url={'https://www.axonivy.com/'} onClick={openUrl} />
      </Flex>
    </Flex>
  );
};
