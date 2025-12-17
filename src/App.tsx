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
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Check auth on mount and listen for storage changes
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

  // Mount point refresh logic
  useEffect(() => {
    const refreshMountPoint = () => {
      // 1. Identify valid targets on the LinkedIn page
      const photoWrapper = document.querySelector('.pv-top-card__non-self-photo-wrapper') as HTMLElement;
      const nameHeading = document.querySelector('h1.text-heading-xlarge, h1.t-24');

      let chosenTarget: HTMLElement | null = null;
      let positionClass = '';

      // 2. PRIORITY LOGIC
      // Priority A: Profile Picture (Preferred location)
      if (photoWrapper) {
        chosenTarget = photoWrapper;
        positionClass = 'ext-pos-photo';

        // CRITICAL FIX: The absolute positioning of our button relies on the parent being relative.
        // LinkedIn sometimes sets this to static, so we force it to relative.
        if (getComputedStyle(photoWrapper).position === 'static') {
          photoWrapper.style.position = 'relative';
        }
      }
      // Priority B: Name Heading (Fallback if no photo)
      else if (nameHeading && nameHeading.parentElement) {
        chosenTarget = nameHeading.parentElement as HTMLElement;
        positionClass = 'ext-pos-name';
      }

      // If no valid target found, clear the button and return
      if (!chosenTarget) {
        setActiveNode(null);
        return;
      }

      // 3. Check if we already injected our specific wrapper
      let wrapper = chosenTarget.querySelector(':scope > .ext-call-btn-wrapper') as HTMLElement;

      if (!wrapper || !wrapper.isConnected) {
        wrapper = document.createElement('div');
        wrapper.className = `ext-call-btn-wrapper ${positionClass}`;
        chosenTarget.appendChild(wrapper);
      }

      // 4. CLEANUP: Remove buttons from other locations (duplicates)
      // This handles cases where user navigates from a profile with a photo to one without
      const allWrappers = document.querySelectorAll('.ext-call-btn-wrapper');
      allWrappers.forEach((el) => {
        if (el !== wrapper) el.remove();
      });

      // 5. Update React State
      setActiveNode(prev => (prev === wrapper ? prev : wrapper));
    };

    // Run aggressively (500ms) to handle LinkedIn's dynamic loading (Ember.js)
    const interval = setInterval(refreshMountPoint, 500);
    return () => clearInterval(interval);
  }, []);

  // Only show CallButton when authenticated, nothing otherwise
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
