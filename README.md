# Uplers Connect

A Chrome extension that injects a **Call Button** into LinkedIn profile pages for one-click calling.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI Components |
| Redux Toolkit | State Management |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Manifest V3 | Chrome Extension API |

---

## How It Works

```
LinkedIn page loads
       ↓
manifest.json injects content.tsx
       ↓
Creates #linkedin-extension-root in body
       ↓
React mounts <App /> with Redux Provider
       ↓
App polls every 500ms for profile elements
       ↓
Finds profile photo (.pv-top-card__non-self-photo-wrapper)
  └── OR fallback to name heading (h1.text-heading-xlarge)
       ↓
Creates wrapper & injects CallButton via React Portal
       ↓
User clicks Call → scrapes name/photo → dispatch(startCall)
       ↓
CallWidget renders (floating bottom-right)
       ↓
User clicks End Call → dispatch(endCall) → widget unmounts
```

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `content.tsx` | Entry point, creates React root in DOM |
| `App.tsx` | Auth check, DOM polling, portal injection |
| `CallButton.tsx` | Injected button, scrapes profile, initiates call |
| `CallWidget.tsx` | Floating call UI with timer, mute, hangup |
| `FloatingDialer.tsx` | Manual dialer pad |

---

## Installation

```bash
npm install
npm run build
```

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `dist/` folder
4. Visit any LinkedIn profile

---

## Development

```bash
npm run build   # Rebuild after changes
```

Then refresh extension in `chrome://extensions` and reload LinkedIn page.
