(function() {
  if (typeof chrome === 'undefined' || !chrome) {
    return;
  }

  if (!chrome.action && chrome.browserAction) {
    chrome.action = chrome.browserAction;
  }

  const nativeExecute = chrome.scripting && typeof chrome.scripting.executeScript === 'function'
    ? chrome.scripting.executeScript.bind(chrome.scripting)
    : null;
  const hasTabsExecute = Boolean(chrome.tabs && typeof chrome.tabs.executeScript === 'function');

  function wrapResults(raw) {
    const values = Array.isArray(raw) ? raw : (raw === undefined ? [] : [raw]);
    return values.map((result) => ({ result: result }));
  }

  function finishCallback(callback, results) {
    if (typeof callback === 'function') {
      try {
        callback(results);
      } catch (error) {
        // Callers must not break the polyfill promise.
      }
    }
    return results;
  }

  function toExtensionFilePath(file) {
    const path = String(file || '').replace(/\\/g, '/').trim();
    if (!path) {
      return '';
    }
    if (path.charAt(0) === '/') {
      return path;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
      return path;
    }
    return '/' + path;
  }

  function executeWithTabsApi(details, callback) {
    return new Promise((resolve) => {
      const done = (results) => resolve(finishCallback(callback, results));
      const target = details && details.target ? details.target : {};
      const tabId = target.tabId;
      if (typeof tabId !== 'number' || !hasTabsExecute) {
        done();
        return;
      }
      const inject = {
        runAt: details && details.injectImmediately ? 'document_start' : 'document_end'
      };
      if (target.allFrames === true) {
        inject.allFrames = true;
      } else if (Array.isArray(target.frameIds) && typeof target.frameIds[0] === 'number') {
        inject.frameId = target.frameIds[0];
      }

      const failed = () => Boolean(chrome.runtime && chrome.runtime.lastError);

      if (Array.isArray(details.files) && details.files.length) {
        const files = details.files
          .map((file) => toExtensionFilePath(file))
          .filter(Boolean);
        const next = (index) => {
          if (index >= files.length) {
            done([{ result: true }]);
            return;
          }
          chrome.tabs.executeScript(tabId, Object.assign({ file: files[index] }, inject), () => {
            if (failed()) {
              const skipped = String(files[index] || '').indexOf('codex-debug') !== -1;
              if (skipped) {
                next(index + 1);
                return;
              }
              done();
              return;
            }
            next(index + 1);
          });
        };
        next(0);
        return;
      }

      if (typeof details.func === 'function') {
        let argsJson = '[]';
        try {
          argsJson = JSON.stringify(Array.isArray(details.args) ? details.args : []);
        } catch (error) {
          argsJson = '[]';
        }
        const code = '(' + details.func.toString() + ').apply(null, ' + argsJson + ')';
        chrome.tabs.executeScript(tabId, Object.assign({ code: code }, inject), (raw) => {
          if (failed()) {
            done();
            return;
          }
          done(wrapResults(raw));
        });
        return;
      }

      done();
    });
  }

  function executeNativeOneFileAtATime(details, callback) {
    if (!nativeExecute) {
      return Promise.resolve(finishCallback(callback));
    }
    const files = details && Array.isArray(details.files)
      ? details.files.map((file) => toExtensionFilePath(file)).filter(Boolean)
      : [];
    if (files.length > 1) {
      const run = (index) => {
        if (index >= files.length) {
          return Promise.resolve(finishCallback(callback, [{ result: true }]));
        }
        const payload = Object.assign({}, details, { files: [files[index]] });
        return Promise.resolve(nativeExecute(payload)).then(() => run(index + 1), (error) => {
          if (String(files[index] || '').indexOf('codex-debug') !== -1) {
            return run(index + 1);
          }
          throw error;
        });
      };
      return run(0);
    }
    const payload = files.length === 1
      ? Object.assign({}, details, { files: files })
      : details;
    return Promise.resolve(nativeExecute(payload)).then((results) => finishCallback(callback, results));
  }

  chrome.scripting = chrome.scripting || {};
  chrome.scripting.executeScript = function(details, callback) {
    if (hasTabsExecute) {
      return executeWithTabsApi(details, callback);
    }
    return executeNativeOneFileAtATime(details, callback);
  };
})();
