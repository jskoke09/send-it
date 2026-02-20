# Send It — Climbing Session Tracker

A PWA for tracking climbing sessions, logging sends, and staying committed to training.

---

## Deploy to Vercel (easiest — 5 minutes)

### Option A: Drag & Drop (no Git needed)
1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Run locally first to build:
   ```bash
   npm install
   npm run build
   ```
3. Drag the `build/` folder onto [vercel.com/new](https://vercel.com/new)
4. Done! You'll get a URL like `send-it-xyz.vercel.app`

### Option B: Via GitHub (auto-deploys on changes)
1. Push this folder to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo
4. Framework: **Create React App**
5. Click Deploy

---

## Install on Your Phone

Once deployed:

### Android
1. Open your Vercel URL in Chrome
2. Tap the **three dots** menu (top right)
3. Tap **"Add to Home Screen"** or **"Install App"**
4. It now lives on your home screen like a native app

### iPhone
1. Open your Vercel URL in **Safari**
2. Tap the **Share** button (bottom center)
3. Tap **"Add to Home Screen"**
4. Name it "Send It" and tap Add

---

## Run Locally

```bash
npm install
npm start
```

Opens at `http://localhost:3000`

---

## Features
- **Session logging**: date, gym, duration, energy levels, skin condition, psych level
- **Climb tracking**: grade (VB-V12), color tag, attempts, sent/flash, style, route notes
- **Dashboard**: weekly goal progress, streak, highest send, total stats
- **Goals**: target grade, weekly frequency, competition countdown
- **Grade progression chart**
- **Offline support** via service worker
- **Data persists** in localStorage
