const UPLERS_BASE_URL = 'https://platform.uplers.com';
const STORE_EXTENSION_URL = `${UPLERS_BASE_URL}/api/app/job-candidates/plivio/store-extension`;

async function postExtensionEvent(event, token) {
  try {
    if (!token) return;

    const version = chrome.runtime.getManifest().version;

    console.log('[Uplers Connect] store-extension event:', {
      event,
      version,
      token,
    });

    await fetch(STORE_EXTENSION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event,
        version,
      }),
    });
  } catch (error) {
    console.error('Failed to store extension event:', error);
  }
}

// When extension is installed, clear storage (but DO NOT clear on update)
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details?.reason === 'install') {
    console.log('[Uplers Connect] onInstalled "install" detected. Clearing storage.');
    await chrome.storage.local.clear();
    return;
  }

  if (details?.reason === 'update') {
    const result = await chrome.storage.local.get(['recruiter_user_token']);
    console.log('[Uplers Connect] onInstalled "update" detected. Will send extension_updated if token exists.', {
      version: chrome.runtime.getManifest().version,
      token: result.recruiter_user_token,
    });
    await postExtensionEvent('extension_updated', result.recruiter_user_token);
  }
});

// Listen for tab updates - when user visits Uplers, get their token
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes(`${UPLERS_BASE_URL}/app`)) {
    chrome.tabs.sendMessage(tabId, { action: 'getLocalStorage' });
  }
});

// Listen for storage changes, store auth events, and reload LinkedIn tabs
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.recruiter_user_token) {
    const oldToken = changes.recruiter_user_token.oldValue;
    const newToken = changes.recruiter_user_token.newValue;

    if (!oldToken && newToken) {
      console.log('[Uplers Connect] login detected (token set).', { token: newToken });
      postExtensionEvent('logged_in', newToken);
    } else if (oldToken && !newToken) {
      console.log('[Uplers Connect] logout detected (token removed).', { token: oldToken });
      postExtensionEvent('logged_out', oldToken);
    }

    chrome.tabs.query({ url: '*://*.linkedin.com/*' }, (tabs) => {
      tabs.forEach((tab) => chrome.tabs.reload(tab.id));
    });
  }
});
