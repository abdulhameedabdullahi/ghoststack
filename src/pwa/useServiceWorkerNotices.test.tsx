// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceWorkerCallbacks } from './registerServiceWorker';

const applyUpdate = vi.fn(async () => {});
let captured: ServiceWorkerCallbacks | null = null;

vi.mock('./registerServiceWorker', () => ({
  registerServiceWorker: (cb: ServiceWorkerCallbacks) => {
    captured = cb;
    return { applyUpdate };
  },
}));

import { useServiceWorkerNotices } from './useServiceWorkerNotices';

const KEY = 'ghoststack:offlineNoticeShown';

beforeEach(() => {
  captured = null;
  applyUpdate.mockClear();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useServiceWorkerNotices', () => {
  it('shows the offline notice once and sets the flag', () => {
    const { result } = renderHook(() => useServiceWorkerNotices());
    expect(result.current.notice).toBeNull();
    act(() => captured!.onOfflineReady());
    expect(result.current.notice).toBe('offline');
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('does not show the offline notice on a second mount', () => {
    const first = renderHook(() => useServiceWorkerNotices());
    act(() => captured!.onOfflineReady());
    first.unmount();
    const second = renderHook(() => useServiceWorkerNotices());
    act(() => captured!.onOfflineReady());
    expect(second.result.current.notice).toBeNull();
  });

  it('shows the update notice when both are due', () => {
    const { result } = renderHook(() => useServiceWorkerNotices());
    act(() => {
      captured!.onOfflineReady();
      captured!.onNeedRefresh();
    });
    expect(result.current.notice).toBe('update');
  });

  it('hides the offline notice when closed', () => {
    const { result } = renderHook(() => useServiceWorkerNotices());
    act(() => captured!.onOfflineReady());
    act(() => result.current.closeOffline());
    expect(result.current.notice).toBeNull();
  });

  it('applyUpdate calls the registered handle', async () => {
    const { result } = renderHook(() => useServiceWorkerNotices());
    await act(async () => {
      await result.current.applyUpdate();
    });
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not throw when localStorage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useServiceWorkerNotices());
    expect(() => act(() => captured!.onOfflineReady())).not.toThrow();
    expect(result.current.notice).toBe('offline');
  });
});
