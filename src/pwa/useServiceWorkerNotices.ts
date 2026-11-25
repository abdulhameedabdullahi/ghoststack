import { useCallback, useEffect, useRef, useState } from 'react';
import {
  registerServiceWorker,
  type ServiceWorkerHandle,
} from './registerServiceWorker';

export type NoticeKind = 'update' | 'offline' | null;

const OFFLINE_FLAG_KEY = 'ghoststack:offlineNoticeShown';

function offlineNoticeAlreadyShown(): boolean {
  try {
    return localStorage.getItem(OFFLINE_FLAG_KEY) !== null;
  } catch {
    return false;
  }
}

function markOfflineNoticeShown(): void {
  try {
    localStorage.setItem(OFFLINE_FLAG_KEY, '1');
  } catch {
    // If this fails, the notice may show again on the next first load.
  }
}

export function useServiceWorkerNotices(): {
  notice: NoticeKind;
  closeOffline: () => void;
  applyUpdate: () => Promise<void>;
} {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const handleRef = useRef<ServiceWorkerHandle | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;
    handleRef.current = registerServiceWorker({
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => {
        if (!offlineNoticeAlreadyShown()) setOfflineReady(true);
      },
    });
  }, []);

  const notice: NoticeKind = needRefresh
    ? 'update'
    : offlineReady
      ? 'offline'
      : null;

  useEffect(() => {
    if (notice === 'offline') markOfflineNoticeShown();
  }, [notice]);

  const closeOffline = useCallback(() => setOfflineReady(false), []);

  const applyUpdate = useCallback(async () => {
    await handleRef.current?.applyUpdate();
  }, []);

  return { notice, closeOffline, applyUpdate };
}
