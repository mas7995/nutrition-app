# Nutrition Scanner

A personal, goal-aligned nutrition app. You define your goals first — daily
macro targets and food rules — then scan a product barcode and instantly see
whether that food fits your plan. **Green** fits, **amber** is moderate,
**red** violates a rule you set. It always tells you *why*.

The differentiator is the **alignment engine** and its explainability: this is
not a nutrition-label reader, it's a judgment call against your plan.

> Not medical advice. A personal informational tool used alongside a dietician.

## Stack

- **App:** Expo (React Native) + TypeScript (strict), Expo Router
- **Backend:** Supabase — Postgres, Auth (magic link), RLS, Realtime, Edge Functions
- **Scanning:** `expo-camera` (EAN-13/8, UPC-A/E)
- **Food data:** Nutritionix (primary) → Open Food Facts (fallback), via an Edge Function
- **Data:** React Query (TanStack) against Supabase
- **Design:** owned token file + a small component library (no heavy UI kit)

## Running it (Expo Go)

```bash
npm install
cp .env.example .env    # fill in your Supabase URL + anon key when ready
npm start               # then scan the QR code with Expo Go on your phone
```

You do **not** need Xcode or Android Studio — install **Expo Go** on your
phone and scan the QR code that `npm start` prints.

During early phases the app runs without credentials (it warns in the console
and shows a "Supabase not configured" chip). Auth and data features light up
once `.env` is filled in.

## Environment variables

Copy `.env.example` → `.env` (gitignored). Only two public values live in the
app bundle:

| Var | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public; RLS is the real guard) |

Food-API keys (`NUTRITIONIX_APP_ID` / `NUTRITIONIX_APP_KEY`) **never** ship in
the app — they live only in the `lookup-food` Edge Function's server-side env.

## Project layout

```
app/                 Expo Router routes
  _layout.tsx        Providers: Theme, React Query, SafeArea, GestureHandler
  index.tsx          Phase 1 system-check landing screen
src/
  components/        Owned primitives: Button, Card, Ring, Tag, DataRow, Text, Screen
  theme/             Design tokens + ThemeProvider (light/dark)
  lib/               supabase client, React Query client
  types/             Single-source-of-truth types (food, verdict, diet)
assets/              App icons / splash
```

## Web hosting (Railway)

The app also builds as a single-page web app so it can be hosted at a URL —
handy for trying it without Expo Go. Railway is pre-configured via
`railway.json`:

- **Build:** `npm run build:web` → `expo export --platform web` → `dist/`
- **Serve:** `npm run serve:web` → `node server.js` (zero-dep static server with
  SPA fallback, listens on `$PORT`)

Deploy from the Railway dashboard: **New Project → Deploy from GitHub repo →**
pick this repo and the working branch → Railway reads `railway.json` and builds
automatically → **Settings → Networking → Generate Domain** for a public URL.

Note: in-browser barcode scanning is unreliable on mobile Safari; use manual
entry on web. Native builds (Expo Go / EAS) get full camera scanning.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server (QR for Expo Go) |
| `npm run typecheck` | `tsc --noEmit` (strict, no `any`) |
| `npm test` | Jest (engine unit tests land in Phase 5) |

## Build phases

1. **Scaffold** ✅ — Expo Router, Supabase client, React Query, tokens + primitives
2. **Auth + roles** ✅ — magic-link sign-in, client/dietician routing, RLS foundations
3. **Goals** ✅ — diet-profile presets + fine-tuning, persisted to `diet_profiles`
4. **Food lookup** ✅ — `lookup-food` Edge Function (Nutritionix → OFF), normalization, `foods` cache
5. **Scanner + engine** ✅ — camera scan, alignment engine (16 unit tests), verdict card, logging
6. **Today + history** ✅ — macro rings, remaining budget, today's log, adherence trend
7. Dietician — invite-code linking, RLS, dashboard, notes, Realtime
8. Polish — haptics, animation, empty/error states, manual entry, dark mode
