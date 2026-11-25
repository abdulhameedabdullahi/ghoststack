import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './registerServiceWorker';

function makeCallbacks() {
  return { onOfflineReady: vi.fn(), onNeedRefresh: vi.fn() };
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null and calls nothing in the test environment', () => {
    const cb = makeCallbacks();
    expect(registerServiceWorker(cb)).toBeNull();
    expect(cb.onOfflineReady).not.toHaveBeenCalled();
    expect(cb.onNeedRefresh).not.toHaveBeenCalled();
  });

  it('returns null without throwing when navigator.serviceWorker is missing', () => {
    vi.stubEnv('PROD', true);
    expect('serviceWorker' in navigator).toBe(false);
    const cb = makeCallbacks();
    expect(() => registerServiceWorker(cb)).not.toThrow();
    expect(registerServiceWorker(cb)).toBeNull();
    expect(cb.onOfflineReady).not.toHaveBeenCalled();
    expect(cb.onNeedRefresh).not.toHaveBeenCalled();
  });
});
