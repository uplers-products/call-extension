import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Import CSS as inline string to avoid dynamic fetch issues in Chrome extensions
import styles from './assets/styles.css?inline';

// 1. Inject styles directly into the page
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);

// 2. Create the container for our extension
const rootDiv = document.createElement('div');
rootDiv.id = 'linkedin-extension-root';

// 3. Append to body (Ensures persistence across SPA navigation)
document.body.appendChild(rootDiv);

// 4. Render React
const root = createRoot(rootDiv);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);