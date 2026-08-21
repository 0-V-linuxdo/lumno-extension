(function() {
  const grantButton = document.getElementById('grant');
  const status = document.getElementById('status');
  const origins = ['<all_urls>'];

  function setStatus(text, kind) {
    if (!status) {
      return;
    }
    status.textContent = text || '';
    status.className = 'status' + (kind ? ' ' + kind : '');
  }

  function hasPermissionsApi() {
    return Boolean(chrome && chrome.permissions &&
      typeof chrome.permissions.contains === 'function' &&
      typeof chrome.permissions.request === 'function');
  }

  function refreshGranted() {
    if (!hasPermissionsApi()) {
      setStatus('当前环境无法请求权限。请到 about:addons 手动打开网站访问。', 'warn');
      return;
    }
    chrome.permissions.contains({ origins: origins }, (granted) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        setStatus(chrome.runtime.lastError.message || '无法检查权限', 'warn');
        return;
      }
      if (granted) {
        setStatus('已授权。请回到 https 页面刷新一次，再按 Alt+K / Alt+Q。', 'ok');
        if (grantButton) {
          grantButton.textContent = '已授权';
          grantButton.disabled = true;
        }
      }
    });
  }

  if (grantButton) {
    grantButton.addEventListener('click', () => {
      if (!hasPermissionsApi()) {
        setStatus('请到 about:addons → Lumno → 权限 手动打开网站访问。', 'warn');
        return;
      }
      chrome.permissions.request({ origins: origins }, (granted) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          setStatus(chrome.runtime.lastError.message || '授权失败', 'warn');
          return;
        }
        if (granted) {
          setStatus('已授权。请回到 https 页面刷新一次，再按 Alt+K / Alt+Q。', 'ok');
          grantButton.textContent = '已授权';
          grantButton.disabled = true;
          return;
        }
        setStatus('未授权。可到 about:addons → Lumno → 权限 手动打开。', 'warn');
      });
    });
  }

  refreshGranted();
})();
