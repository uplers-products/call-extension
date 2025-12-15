# LinkedIn Call Extension

A Chrome extension that injects a **Call Button** into LinkedIn profile pages, enabling one-click calling functionality for recruiters and talent acquisition professionals.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Technical Deep Dive](#technical-deep-dive)
- [File Structure](#file-structure)
- [State Management](#state-management)
- [DOM Injection Strategy](#dom-injection-strategy)
- [Build Configuration](#build-configuration)
- [Installation](#installation)
- [Development](#development)

---

## Overview

This extension is a **Content Script-based Chrome Extension** built with:

| Technology | Purpose |
|------------|---------|
| **React 19** | UI Components |
| **Redux Toolkit** | Global State Management |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool & Bundler |
| **Manifest V3** | Chrome Extension API |

The extension monitors LinkedIn profile pages and dynamically injects a call button near the user's profile picture or name, allowing instant calling without leaving the page.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LinkedIn Page (DOM)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐                                               │
│   │ Profile Photo   │◄─── Call Button injected here (Priority A)   │
│   │ or Name         │◄─── Fallback injection point (Priority B)    │
│   └─────────────────┘                                               │
│                                                                     │
│   ┌──────────────────────────────────────────┐                      │
│   │ #linkedin-extension-root (Fixed Overlay) │                      │
│   │  ├── CallWidget (Floating, bottom-right) │                      │
│   │  └── CallButton (Portaled to Profile)    │                      │
│   └──────────────────────────────────────────┘                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### 1. Extension Initialization Flow

```
Browser loads LinkedIn page
        │
        ▼
manifest.json triggers content script injection
        │
        ▼
content.tsx executes immediately
        │
        ▼
Creates #linkedin-extension-root div
        │
        ▼
Appends to document.body
        │
        ▼
React mounts <App /> inside root
        │
        ▼
App starts polling for profile elements
        │
        ▼
Button injected when profile detected
```

### 2. The Content Script Entry Point

The entry point `content.tsx` is the **first code that runs** when you visit any LinkedIn page:

```tsx
// 1. Create a container for the React app
const rootDiv = document.createElement('div');
rootDiv.id = 'linkedin-extension-root';

// 2. Append to body (persists across SPA navigation)
document.body.appendChild(rootDiv);

// 3. Render the React application
const root = createRoot(rootDiv);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Why append to `document.body`?**
- LinkedIn is a **Single Page Application (SPA)** built with Ember.js
- The main content area gets replaced during navigation
- Appending to `body` ensures our root persists across page transitions

### 3. The Polling Mechanism

LinkedIn dynamically loads content via JavaScript. The extension uses a **polling strategy** to detect when profile elements appear:

```tsx
useEffect(() => {
  const interval = setInterval(refreshMountPoint, 500);
  return () => clearInterval(interval);
}, []);
```

**Every 500ms, the extension:**
1. Searches for profile photo wrapper (`.pv-top-card__non-self-photo-wrapper`)
2. Falls back to name heading (`h1.text-heading-xlarge`)
3. Creates/updates the button mount point
4. Cleans up duplicate buttons from previous profiles

### 4. React Portal Injection

Instead of manipulating the DOM directly, the extension uses **React Portals** to render the button inside LinkedIn's DOM while keeping React's virtual DOM intact:

```tsx
{activeNode && activeNode.isConnected && createPortal(
  <CallButton />,
  activeNode
)}
```

**Benefits of Portal Approach:**
- Full React lifecycle for injected components
- Redux state connectivity maintained
- Clean separation of concerns
- Easy event handling

---

## Technical Deep Dive

### Content Script Isolation

```
┌───────────────────────────────────┐
│     LinkedIn Page Context         │
│  (LinkedIn's JS, CSS, Variables)  │
└───────────────────────────────────┘
              │
              │ (Isolated)
              │
┌───────────────────────────────────┐
│    Extension Content Script       │
│  (Our React App, Redux Store)     │
│                                   │
│  - Shares DOM access              │
│  - Separate JS execution context  │
│  - Can inject into LinkedIn DOM   │
└───────────────────────────────────┘
```

### Z-Index Strategy

The extension uses a **maximum z-index** strategy to ensure visibility:

```css
#linkedin-extension-root {
  position: fixed;
  z-index: 2147483647;  /* Maximum 32-bit signed integer */
  pointer-events: none;  /* Let clicks pass through */
}

#linkedin-extension-root * {
  pointer-events: auto;  /* Re-enable for our elements */
}
```

This creates an invisible overlay that:
- Sits above all LinkedIn elements
- Allows clicking through to LinkedIn
- Only captures clicks on our components

### Position Fix for Profile Photos

LinkedIn sometimes uses `position: static` on the photo wrapper, breaking absolute positioning:

```tsx
if (getComputedStyle(photoWrapper).position === 'static') {
  photoWrapper.style.position = 'relative';
}
```

This ensures our absolutely-positioned button renders correctly relative to the photo.

---

## File Structure

```
linkedin-call-extension/
├── public/
│   └── manifest.json          # Chrome Extension configuration
├── src/
│   ├── content.tsx            # Entry point (injected into LinkedIn)
│   ├── App.tsx                # Main React component + DOM observer
│   ├── assets/
│   │   └── styles.css         # All component styles
│   ├── components/
│   │   ├── CallButton.tsx     # The injected call button
│   │   └── CallWidget.tsx     # Floating call UI widget
│   └── store/
│       ├── store.ts           # Redux store configuration
│       └── callSlice.ts       # Call state management
├── dist/                      # Build output (loaded by Chrome)
├── vite.config.ts             # Vite build configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies
```

---

## State Management

### Redux Store Structure

```typescript
interface CallState {
  isCalling: boolean;      // Is a call currently active?
  isMinimized: boolean;    // Is the call widget minimized?
  talentData: {
    name: string;          // Candidate name (scraped)
    photoUrl: string;      // Profile photo URL (scraped)
    contact_number?: string; // Phone number (from API)
  } | null;
}
```

### Actions

| Action | Purpose |
|--------|---------|
| `startCall(talentData)` | Initiates call, stores candidate info |
| `endCall()` | Terminates call, clears data |
| `toggleMinimize()` | Toggles widget between full/minimized view |

### State Flow

```
User clicks "Call" button
        │
        ▼
CallButton scrapes DOM for name/photo
        │
        ▼
Simulates API call for phone number
        │
        ▼
dispatch(startCall({ name, photoUrl, contact_number }))
        │
        ▼
Redux updates: isCalling = true
        │
        ▼
CallWidget renders (conditional on isCalling)
        │
        ▼
User clicks "End Call"
        │
        ▼
dispatch(endCall())
        │
        ▼
Redux updates: isCalling = false, talentData = null
        │
        ▼
CallWidget unmounts
```

---

## DOM Injection Strategy

### Priority-Based Targeting

```tsx
// Priority A: Profile Photo (Best UX)
const photoWrapper = document.querySelector('.pv-top-card__non-self-photo-wrapper');

// Priority B: Name Heading (Fallback)
const nameHeading = document.querySelector('h1.text-heading-xlarge, h1.t-24');
```

### Duplicate Prevention

When navigating between profiles, old buttons may persist. The extension cleans up:

```tsx
const allWrappers = document.querySelectorAll('.ext-call-btn-wrapper');
allWrappers.forEach(el => {
  if (el !== wrapper) {
    el.remove();  // Remove orphaned buttons
  }
});
```

### Wrapper Creation

```tsx
let wrapper = chosenTarget.querySelector(':scope > .ext-call-btn-wrapper');

if (!wrapper || !wrapper.isConnected) {
  wrapper = document.createElement('div');
  wrapper.className = `ext-call-btn-wrapper ${positionClass}`;
  chosenTarget.appendChild(wrapper);
}
```

**The `:scope >` selector** ensures we only find direct children, preventing false positives.

---

## Build Configuration

### Vite Configuration

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.tsx'),
      },
      output: {
        entryFileNames: '[name].js',        // → content.js
        assetFileNames: 'assets/[name].[ext]', // → assets/content.css
      },
    },
    outDir: 'dist',
  },
});
```

**Key Points:**
- Single entry point (`content.tsx`)
- Outputs `content.js` (matches manifest.json)
- CSS extracted to `assets/content.css`

### Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "LinkedIn Call Extension",
  "version": "1.0",
  "permissions": ["activeTab", "scripting"],
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/*"],
      "js": ["content.js"],
      "css": ["assets/content.css"]
    }
  ]
}
```

**Content Script Properties:**
- `matches`: Only runs on LinkedIn
- `js`: JavaScript bundle injected
- `css`: Styles injected before page renders

---

## Installation

### For Development

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd linkedin-call-extension
   npm install
   ```

2. **Build the Extension**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Navigate to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist/` folder

4. **Test**
   - Go to any LinkedIn profile page
   - The call button should appear near the profile photo

---

## Development

### Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (not used for extensions) |
| `npm run build` | Build production bundle to `dist/` |
| `npm run lint` | Run ESLint |

### Development Workflow

1. Make changes to source files
2. Run `npm run build`
3. Go to `chrome://extensions`
4. Click the refresh icon on the extension
5. Refresh the LinkedIn page

### Debugging

- **Console Logs**: Open DevTools on LinkedIn, logs appear in Console
- **React DevTools**: Works if you install the Chrome extension
- **Redux DevTools**: Can be configured if needed

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Polling (500ms)** | LinkedIn's Ember.js renders dynamically; MutationObserver was unreliable |
| **React Portals** | Maintain React context while injecting into LinkedIn's DOM |
| **Redux Toolkit** | Predictable state for call lifecycle across components |
| **Fixed overlay + pointer-events** | Non-invasive overlay that doesn't block LinkedIn interactions |
| **CSS classes with `ext-` prefix** | Avoid style collisions with LinkedIn's CSS |

---

## Future Enhancements

- [ ] Integrate with actual VoIP service (Plivo/Twilio)
- [ ] Add background script for persistent state
- [ ] Implement call history storage
- [ ] Add popup UI for settings
- [ ] Support LinkedIn Recruiter pages


