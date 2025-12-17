const UPLERS_BASE_URL = 'https://platform.uplers.com';

// When extension is installed, clear storage
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.clear();
});

// Listen for tab updates - when user visits Uplers, get their token
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes(`${UPLERS_BASE_URL}/app`)) {
    chrome.tabs.sendMessage(tabId, { action: 'getLocalStorage' });
  }
});

// Listen for storage changes and reload LinkedIn tabs
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.recruiter_user_token) {
    chrome.tabs.query({ url: '*://*.linkedin.com/*' }, (tabs) => {
      tabs.forEach((tab) => chrome.tabs.reload(tab.id));
    });
  }
});
