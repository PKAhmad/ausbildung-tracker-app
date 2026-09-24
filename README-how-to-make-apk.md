# Ausbildung Tracker — App / APK Guide

Your tracker is now a standalone installable app. Data saves on the device (localStorage), works offline, and no longer needs Claude to run.

## Files in this folder
- `index.html` — the app (this is the main file)
- `manifest.json` — app name, icon, colors
- `service-worker.js` — offline support
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — app icons

All files must stay **together in the same folder** when hosting.

---

## OPTION A — Install as an app (fastest, no APK)

1. Host the folder for free (pick one):
   - **Netlify Drop**: go to https://app.netlify.com/drop and drag the whole folder in. You get a live link instantly.
   - **GitHub Pages**: create a repo, upload all files, enable Pages in Settings.
   - **Vercel**: https://vercel.com → import the folder.

2. Open the live link on your Android phone in **Chrome**.

3. Tap the **⋮ menu → "Add to Home screen" / "Install app."**

4. Done — it gets the K icon, opens fullscreen, works offline.

(On iPhone: Safari → Share → "Add to Home Screen.")

---

## OPTION B — Build a real APK (installable file / Play Store)

1. First host it (do Option A step 1 — you need a live https link).

2. Go to **https://www.pwabuilder.com**

3. Paste your live link → click **Start**.

4. It checks the app, then click **Package for stores → Android**.

5. Download the generated **.apk** (for direct install) or **.aab** (for Play Store).

6. To install the .apk directly on your phone: transfer it, then open it and allow "Install from unknown sources."

PWABuilder does the Android wrapping for you — no Android Studio needed.

---

## OPTION C — Full native build (most control)

Only if you later want native features / Play Store with your own signing:
- Install Node.js + Android Studio
- Use **Capacitor** (`npm i @capacitor/core @capacitor/cli`, `npx cap init`, put these files in `www/`, `npx cap add android`, build in Android Studio).
This is the most involved route — Option B covers almost everyone.

---

## Notes
- **Translation** needs internet (uses Google's free translate endpoint). Everything else works offline.
- **Your data** is stored on the device. Clearing the browser/app data will erase it. (If you later want cloud sync across devices, that needs a small backend — ask and I can add it.)
- To update the app after changes, re-upload the files and bump the cache name in `service-worker.js` (e.g. `ausbildung-v2`).
