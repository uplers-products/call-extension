import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './assets/styles.css'; // Import global styles

// 1. Create the container for our extension
const rootDiv = document.createElement('div');
rootDiv.id = 'linkedin-extension-root';

// 2. Append to body (Ensures persistence across SPA navigation)
document.body.appendChild(rootDiv);

// 3. Render React
const root = createRoot(rootDiv);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);