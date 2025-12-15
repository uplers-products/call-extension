import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Provider } from 'react-redux';
import store from './store/store';
import CallWidget from './components/CallWidget';
import CallButton from './components/CallButton';

const App: React.FC = () => {
  // We only track ONE active node for the button
  const [activeNode, setActiveNode] = useState<HTMLElement | null>(null);

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
      allWrappers.forEach(el => {
        if (el !== wrapper) {
          el.remove();
        }
      });

      // 5. Update React State
      setActiveNode(prev => (prev === wrapper ? prev : wrapper));
    };

    // Run aggressively (500ms) to handle LinkedIn's dynamic loading (Ember.js)
    const interval = setInterval(refreshMountPoint, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Provider store={store}>
      {/* 1. Global Call Widget (Visible only during call) */}
      <CallWidget />

      {/* 2. Injected Call Button (Portal) */}
      {activeNode && activeNode.isConnected && createPortal(
        <CallButton />,
        activeNode
      )}
    </Provider>
  );
};

export default App;