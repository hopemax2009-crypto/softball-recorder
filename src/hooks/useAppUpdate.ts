import { useCallback, useEffect, useState } from 'react';
import { checkForAppUpdate, getClientBuildId, reloadToLatestApp } from '../utils/appUpdate';

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkNow = useCallback(async () => {
    setChecking(true);
    try {
      setUpdateAvailable(await checkForAppUpdate());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [checkNow]);

  return {
    updateAvailable,
    checking,
    clientBuildId: getClientBuildId(),
    checkNow,
    reloadToLatest: reloadToLatestApp,
  };
}
