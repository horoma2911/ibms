# Capacitor setup notes

This repo includes a minimal `capacitor.config.json`. To prepare a Capacitor mobile wrapper:

1. Install Capacitor (in a Node environment in this repo):

```bash
npm install --global @capacitor/cli
npm install @capacitor/core
```

2. Initialize Capacitor (choose platform when prompted):

```bash
npx cap init
```

3. Configure `webDir` to point to the built frontend (e.g. `dist` or the repo root if static files are in place).
4. Add platforms and copy web assets:

```bash
npx cap add android
npx cap copy
npx cap open android
```

Notes:
- The project contains a Laravel backend under `backend/` and a static frontend in the repo root. Adjust `webDir` to the directory that contains the built frontend assets.
- You will need Node.js, npm, Android Studio/Xcode to build native platforms.
