import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store, { type RootState } from './store/store';
import { setAuth, clearAuth, setLoading } from './store/authSlice';
import { closeWhatsappModal, openWhatsappModal } from './store/callSlice';
import { PlivoProvider } from './context/PlivoContext';
import CallWidget from './components/CallWidget';
import CallButton from './components/CallButton';
import FloatingDialer from './components/FloatingDialer';
import WhatsappModal from './components/WhatsappModal';

const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const [activeNode, setActiveNode] = useState<HTMLElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState(window.location.href);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { callPopupOpen, callStatus, talentData, whatsappModalOpen } = useSelector((state: RootState) => state.call);

  const isCallInProgress =
    callPopupOpen && callStatus !== 'idle' && callStatus !== 'ended' && callStatus !== 'failed';

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

  // Warn if user tries to reload/close/navigate away during an active call
  useEffect(() => {
    if (!isCallInProgress) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome ignores custom text; setting returnValue is still required to trigger the prompt.
      e.returnValue = 'A call is in progress. Are you sure you want to leave this page?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isCallInProgress]);

  // Open WhatsApp modal once, when the call transitions to "ended"
  const prevCallStatusRef = useRef(callStatus);
  useEffect(() => {
    if (
      prevCallStatusRef.current !== 'ended' &&
      callStatus === 'ended' &&
      talentData &&
      !whatsappModalOpen
    ) {
      dispatch(openWhatsappModal());
    }
    prevCallStatusRef.current = callStatus;
  }, [callStatus, dispatch, talentData, whatsappModalOpen]);

  // If call moves away from "ended" (e.g., callback), auto-close WhatsApp modal
  useEffect(() => {
    if (whatsappModalOpen && callStatus !== 'ended') {
      dispatch(closeWhatsappModal());
    }
  }, [callStatus, dispatch, whatsappModalOpen]);

  useEffect(() => { // Inject call button only on LinkedIn profile pages
    // Only proceed if user is authenticated AND on a LinkedIn profile page
    if (!isAuthenticated || !isLinkedInProfilePage()) {
      const allWrappers = document.querySelectorAll('.ext-call-btn-wrapper');
      allWrappers.forEach((el) => el.remove());
      setActiveNode(null);
      return;
    }

    const refreshMountPoint = () => {
      // Early return optimization: Check if we already have a valid connected wrapper in DOM
      const existingValidWrapper = document.querySelector('.ext-call-btn-wrapper.ext-pos-photo, .ext-call-btn-wrapper.ext-pos-body-left');
      if (existingValidWrapper && existingValidWrapper.isConnected) {
        // Only check for duplicates if we suspect there might be issues
        const allWrappers = document.querySelectorAll('.ext-call-btn-wrapper');
        if (allWrappers.length > 1) {
          allWrappers.forEach((el) => {
            if (el !== existingValidWrapper) el.remove();
          });
        }
        // Update state only if it changed
        setActiveNode(prev => (prev === existingValidWrapper ? prev : existingValidWrapper as HTMLElement));
        return; // Early return if wrapper is already valid
      }

      // 1. Identify photo wrapper target on the LinkedIn page (check both possible classes)
      const photoWrapper = (document.querySelector('.pv-top-card__non-self-photo-wrapper') || document.querySelector('.pv-top-card__photo-wrapper')) as HTMLElement;

      // If photo wrapper found, use original injection method
      if (photoWrapper) {
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

        // Update React State only if changed
        setActiveNode(prev => (prev === wrapper ? prev : wrapper));
        return;
      }

      // Fallback: If no photo wrapper found, inject into body (middle-left)
      let wrapper: HTMLElement | null = document.querySelector('.ext-call-btn-wrapper.ext-pos-body-left') as HTMLElement;

      if (!wrapper || !wrapper.isConnected) {
        wrapper = document.createElement('div');
        wrapper.className = 'ext-call-btn-wrapper ext-pos-body-left';
        
        // Ensure body has relative positioning for absolute positioning
        if (getComputedStyle(document.body).position === 'static') {
          document.body.style.position = 'relative';
        }
        
        // Check if wrapper already exists
        const existingWrapper = document.body.querySelector('.ext-call-btn-wrapper.ext-pos-body-left');
        if (!existingWrapper) {
          document.body.appendChild(wrapper);
        } else {
          wrapper = existingWrapper as HTMLElement;
        }
      }

      // Remove duplicate wrappers (including photo wrappers if any)
      const allWrappers = document.querySelectorAll('.ext-call-btn-wrapper');
      if (allWrappers.length > 1) {
        allWrappers.forEach((el) => {
          if (el !== wrapper) el.remove();
        });
      }

      // Update React State only if changed
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
          <WhatsappModal isOpen={whatsappModalOpen} talent={talentData} />
          <FloatingDialer />
          {activeNode && activeNode.isConnected && createPortal(<CallButton key={currentUrl} />, activeNode)}
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
