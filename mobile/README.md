# TopRep Mobile

A React Native (Expo) mobile app for the TopRep sales dashboard. It connects to the **same Supabase database** as the web app, giving sales reps access to their pipeline, KPIs, and leaderboard from their phones.

## Features

- 🔐 **Authentication** – Sign in / sign up using the same Supabase credentials as the web app
- 📊 **Dashboard** – MTD revenue, gross profit, closed deals, and active pipeline KPIs with recent deal list
- 🔄 **Pipeline** – Browse deals by stage (Lead → Closed Won/Lost) with a filterable list view
- 🏆 **Leaderboard** – Real-time ranking of sales reps by revenue and gross profit

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/) – `npm install -g expo-cli`
- [Expo Go](https://expo.dev/client) app on your iOS or Android device (for quick testing)

## Setup

1. **Install dependencies**

   ```bash
   cd mobile
   npm install
   ```

2. **Configure environment variables**

   Copy the example file and fill in your Supabase credentials (the same values used in the web app's `.env.local`):

   ```bash
   cp .env.example .env.local
   ```

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   > **Note:** Expo automatically exposes environment variables prefixed with `EXPO_PUBLIC_` to the client. These map directly to the web app's `NEXT_PUBLIC_SUPABASE_*` variables—they point to the same Supabase project.

3. **Start the development server**

   ```bash
   npm start
   ```

   Then scan the QR code with the Expo Go app on your device, or press `i` for iOS Simulator / `a` for Android Emulator.

## Project Structure

```
mobile/
├── App.tsx                        # Root component – auth gate + navigation
├── app.json                       # Expo config (app name, bundle ID, icons)
├── babel.config.js
├── package.json
├── tsconfig.json
├── .env.example                   # Copy to .env.local with real credentials
└── src/
    ├── lib/
    │   └── supabase.ts            # Supabase client (AsyncStorage session persistence)
    ├── navigation/
    │   └── AppNavigator.tsx       # Bottom tab navigator (Dashboard / Pipeline / Leaderboard)
    ├── screens/
    │   ├── DashboardScreen.tsx
    │   ├── PipelineScreen.tsx
    │   └── LeaderboardScreen.tsx
    └── types/
        └── index.ts               # Shared TypeScript interfaces (Deal, Profile, etc.)
```

## Shared Database

The mobile app uses `@supabase/supabase-js` directly (no SSR package required for React Native). It authenticates against the same Supabase project and respects the same Row-Level Security (RLS) policies:

- **Sales reps** see only their own deals and activities.
- **Managers / admins** see all data.

## Building for Production

Use [EAS Build](https://docs.expo.dev/build/introduction/) to create production `.ipa` (iOS) and `.apk`/`.aab` (Android) binaries:

```bash
npm install -g eas-cli
eas build --platform all
```
