(function(global) {
  function isDevelopmentInstall(extensionInfo) {
    return Boolean(extensionInfo && extensionInfo.installType === 'development');
  }

  function isSameVersionReload(details, currentVersion) {
    if (!details || String(details.reason || '') !== 'update') {
      return false;
    }
    const previousVersion = String(details.previousVersion || '').trim();
    const installedVersion = String(currentVersion || '').trim();
    return Boolean(previousVersion && installedVersion && previousVersion === installedVersion);
  }

  function reloadDevelopmentExtensionOnStartup(chromeApi) {
    const api = chromeApi || global.chrome;
    if (!api || !api.management || typeof api.management.getSelf !== 'function' ||
        !api.runtime || typeof api.runtime.reload !== 'function') {
      return Promise.resolve({ reloaded: false, reason: 'api-unavailable' });
    }

    let extensionInfoPromise;
    try {
      extensionInfoPromise = api.management.getSelf();
    } catch (error) {
      return Promise.resolve({ reloaded: false, reason: 'get-self-failed' });
    }

    return Promise.resolve(extensionInfoPromise)
      .then((extensionInfo) => {
        if (!isDevelopmentInstall(extensionInfo)) {
          return { reloaded: false, reason: 'not-development' };
        }
        api.runtime.reload();
        return { reloaded: true, reason: 'development-startup' };
      })
      .catch(() => ({ reloaded: false, reason: 'get-self-failed' }));
  }

  global.LumnoDevExtensionStartup = Object.freeze({
    isDevelopmentInstall,
    isSameVersionReload,
    reloadDevelopmentExtensionOnStartup
  });
})(globalThis);
