chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getLocalStorage') {
    const token = window.localStorage.getItem('accessToken');
    const raUserStr = window.localStorage.getItem('ra_user');

    let raUser = null;

    if (token && raUserStr) {
      try {
        raUser = JSON.parse(raUserStr);
      } catch (e) {
        console.error('Failed to parse ra_user:', e);
      }
    }

    chrome.storage.local.set({
      recruiter_user_token: token,
      ra_user: raUser, // Store the entire ra_user object
    });
  }
});
