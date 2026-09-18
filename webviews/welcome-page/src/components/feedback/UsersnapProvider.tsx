import { loadSpace, type SpaceApi, type SpaceOpenEventCallback } from '@usersnap/browser';
import React, { use, useEffect, useRef, useState } from 'react';
import { SystemInfo } from '../../util/SystemInfo';
import { useMessenger } from '../../util/VscodeApiProvider';
import { UsersnapContext } from './UsersnapContext';

const USERSNAP_SPACE_API_KEY = '86b0c9f0-8b48-4324-b482-cb3dd6aa7ffd';
const USERSNAP_PROJECT_API_KEY = '7a438ff0-3ec7-47b5-9321-f1714349c3ba';

const getCspNonce = () => document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content;

export const useUsersnapApi = () => use(UsersnapContext);

export const UsersnapProvider = ({ children }: React.PropsWithChildren) => {
  const [usersnapApi, setUsersnapApi] = useState<SpaceApi | null>(null);
  const systemInfoRef = useRef<SystemInfo>(null);
  const { messenger } = useMessenger();

  useEffect(() => {
    let api: SpaceApi | undefined;

    const handleOpenWidget: SpaceOpenEventCallback = event => {
      event.api.setValue('custom', {
        ...systemInfoRef.current
      });
    };

    loadSpace(USERSNAP_SPACE_API_KEY, getCspNonce()).then(loadedApi => {
      api = loadedApi;
      api.on('open', handleOpenWidget);
      api.init();

      setUsersnapApi(api);
    });

    return () => {
      api?.off('open', handleOpenWidget);
    };
  }, []);

  const open = async () => {
    if (!usersnapApi) {
      return;
    }

    systemInfoRef.current = await SystemInfo.get(messenger);

    const widgetApi = await usersnapApi.show(USERSNAP_PROJECT_API_KEY);
    widgetApi.open();
  };

  return <UsersnapContext value={{ open }}>{children}</UsersnapContext>;
};
