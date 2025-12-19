import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store, { type RootState } from './store/store';
import { setAuth, clearAuth, setLoading } from './store/authSlice';
import { PlivoProvider } from './context/PlivoContext';
import CallWidget from './components/CallWidget';
import CallButton from './components/CallButton';
import FloatingDialer from './components/FloatingDialer';

const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const [activeNode, setActiveNode] = useState<HTMLElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState(window.location.href);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Check if current URL is a LinkedIn profile page (e.g., /in/username/)
  const isLinkedInProfilePage = (): boolean => {
    return window.location.href.includes('/in/') && window.location.href.includes('linkedin.com');
  };

  // Check auth status and listen for changes
  useEffect(() => {
    const checkAuth = async () => {
      dispatch(setLoading(true));
      try {
        const result = await chrome.storage.local.get([
          'recruiter_user_token',
          'ra_user',
        ]);

        if (result.recruiter_user_token) {
          dispatch(setAuth({
            token: result.recruiter_user_token as string,
            user: (result.ra_user || {}) as Record<string, unknown>,
          }));
        } else {
          dispatch(clearAuth());
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        dispatch(clearAuth());
      }
    };

    checkAuth();

    // Listen for storage changes (when user logs in from another tab)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.recruiter_user_token) {
        checkAuth();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [dispatch]);

  // Simple URL polling to detect LinkedIn SPA navigation
  useEffect(() => {
    const checkUrl = () => {
      if (window.location.href !== currentUrl) {
        setCurrentUrl(window.location.href);
      }
    };

    const interval = setInterval(checkUrl, 1000);
    return () => clearInterval(interval);
  }, [currentUrl]);

  useEffect(() => { // Inject call button only on LinkedIn profile pages
    // Only proceed if user is authenticated AND on a LinkedIn profile page
    if (!isAuthenticated || !isLinkedInProfilePage()) {
      const allWrappers = document.querySelectorAll('.ext-call-btn-wrapper');
      allWrappers.forEach((el) => el.remove());
      setActiveNode(null);
      return;
    }

    const refreshMountPoint = () => {
      // 1. Identify photo wrapper target on the LinkedIn page (check both possible classes)
      const photoWrapper = (document.querySelector('.pv-top-card__non-self-photo-wrapper') || document.querySelector('.pv-top-card__photo-wrapper')) as HTMLElement;

      // If no photo wrapper found, clear the button and show browser alert
      if (!photoWrapper) {
        setActiveNode(null);
        console.log('No photo wrapper found to inject the button');
        return;
      }

      // Ensure parent has relative positioning for absolute positioning
      if (getComputedStyle(photoWrapper).position === 'static') {
        photoWrapper.style.position = 'relative';
      }

      let wrapper = photoWrapper.querySelector(':scope > .ext-call-btn-wrapper') as HTMLElement;

      if (!wrapper || !wrapper.isConnected) {
        wrapper = document.createElement('div');
        wrapper.className = 'ext-call-btn-wrapper ext-pos-photo';
        photoWrapper.appendChild(wrapper);
      }

      // Remove duplicate wrappers
      const allWrappers = document.querySelectorAll('.ext-call-btn-wrapper');
      allWrappers.forEach((el) => {
        if (el !== wrapper) el.remove();
      });

      // 5. Update React State
      setActiveNode(prev => (prev === wrapper ? prev : wrapper));
    };

    // Run aggressively to handle LinkedIn's dynamic loading (Ember.js)
    const interval = setInterval(refreshMountPoint, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, currentUrl]);

  // Show FloatingDialer on all pages when authenticated
  // CallButton only shows on LinkedIn profile pages
  // Login status is handled via extension popup (click on extension icon)
  return (
    <>
      {isAuthenticated && (
        <PlivoProvider>
          <CallWidget />
          <FloatingDialer />
          {activeNode && activeNode.isConnected && createPortal(<CallButton />, activeNode)}
        </PlivoProvider>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
