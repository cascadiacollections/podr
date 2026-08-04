import { registerServiceWorker, unregisterServiceWorker } from '../registerSW';

/**
 * Installs a fake serviceWorker container, or removes it entirely
 */
function setServiceWorker(container: unknown): void {
  if (container === undefined) {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    return;
  }

  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
}

function setSecureContext(isSecureContext: boolean): void {
  Object.defineProperty(window, 'isSecureContext', { value: isSecureContext, configurable: true });
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    setServiceWorker(undefined);
    setSecureContext(true);
  });

  it('does nothing when the browser has no service worker support', async () => {
    setServiceWorker(undefined);

    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it('does nothing outside a secure context', async () => {
    const register = jest.fn();
    setServiceWorker({ register });
    setSecureContext(false);

    await expect(registerServiceWorker()).resolves.toBeUndefined();
    expect(register).not.toHaveBeenCalled();
  });

  it('registers the worker at the site root', async () => {
    const registration = { scope: 'http://localhost/' };
    const register = jest.fn().mockResolvedValue(registration);
    setServiceWorker({ register });
    setSecureContext(true);

    await expect(registerServiceWorker()).resolves.toBe(registration);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('swallows registration failures, since offline support is an enhancement', async () => {
    const register = jest.fn().mockRejectedValue(new Error('storage disabled'));
    setServiceWorker({ register });
    setSecureContext(true);

    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });
});

describe('unregisterServiceWorker', () => {
  afterEach(() => {
    setServiceWorker(undefined);
    setSecureContext(true);
  });

  it('removes every existing registration', async () => {
    const unregister = jest.fn().mockResolvedValue(true);
    setServiceWorker({
      getRegistrations: jest.fn().mockResolvedValue([{ unregister }, { unregister }])
    });
    setSecureContext(true);

    await unregisterServiceWorker();

    expect(unregister).toHaveBeenCalledTimes(2);
  });

  it('is a no-op without support', async () => {
    setServiceWorker(undefined);

    await expect(unregisterServiceWorker()).resolves.toBeUndefined();
  });
});
