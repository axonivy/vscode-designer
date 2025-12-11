import { BasicCheckbox } from '@axonivy/ui-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HOST_EXTENSION, type NotificationType, type RequestType } from 'vscode-messenger-common';
import { useMessenger } from '../util/VscodeApiProvider';

const showWelcomePageType: NotificationType<boolean> = { method: 'showWelcomePage' };
const toggleShowWelcomePageType: RequestType<boolean, boolean> = { method: 'toggleShowWelcomePage' };

export const ShowOnActivationToggle = () => {
  const { t } = useTranslation();
  const { messenger } = useMessenger();

  const [showWelcomePage, setShowWelcomePage] = useState(true);
  messenger.onNotification(showWelcomePageType, (showWelcomePage: boolean) => setShowWelcomePage(showWelcomePage));

  const toggleShowWelcomePage = () => {
    setShowWelcomePage(!showWelcomePage);
    messenger.sendRequest(toggleShowWelcomePageType, HOST_EXTENSION);
  };

  return <BasicCheckbox label={t('welcomePage.showWelcomePage')} checked={showWelcomePage} onCheckedChange={toggleShowWelcomePage} />;
};
