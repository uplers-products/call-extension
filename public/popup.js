const UPLERS_BASE_URL = 'https://platform.uplers.com';

// DOM Elements
const loadingState = document.getElementById('loading-state');
const loggedInState = document.getElementById('logged-in-state');
const loggedOutState = document.getElementById('logged-out-state');
const userEmail = document.getElementById('user-email');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// Show a specific state, hide others
function showState(state) {
  loadingState.classList.add('hidden');
  loggedInState.classList.add('hidden');
  loggedOutState.classList.add('hidden');
  state.classList.remove('hidden');
}

// Check authentication status
async function checkAuthStatus() {
  showState(loadingState);

  try {
    const result = await chrome.storage.local.get([
      'recruiter_user_token',
      'ra_user'
    ]);

    if (result.recruiter_user_token) {
      // User is logged in
      const user = result.ra_user || {};
      const email = user.email || user.name || 'Uplers User';
      userEmail.textContent = email;
      showState(loggedInState);
    } else {
      // User is not logged in
      showState(loggedOutState);
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showState(loggedOutState);
  }
}

// Handle login button click
function handleLogin() {
  chrome.tabs.create({ url: `${UPLERS_BASE_URL}/app/login` });
  window.close();
}

// Handle logout button click
async function handleLogout() {
  try {
    await chrome.storage.local.remove(['recruiter_user_token', 'ra_user']);
    showState(loggedOutState);
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Event Listeners
loginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

// Listen for storage changes (in case user logs in from another tab)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.recruiter_user_token) {
    checkAuthStatus();
  }
});

// Initial check
checkAuthStatus();
