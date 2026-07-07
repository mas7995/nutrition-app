# Supabase setup

The backend for this app is a managed Supabase project. Everything the app
needs lives here as SQL migrations plus a couple of dashboard settings.

## 1. Run the migrations

The simplest path (no CLI needed):

1. Open your project → **SQL Editor** → **New query**.
2. Paste the contents of each file in `migrations/` **in numeric order**
   (`0001_…`, `0002_…`, …) and run each one.

Migrations are additive and safe to re-run (they use `if not exists` /
`drop policy if exists`).

If you prefer the Supabase CLI: `supabase link` then `supabase db push`.

### Applied so far

| File | Adds |
| --- | --- |
| `0001_profiles.sql` | `profiles` table + own-row RLS policies (Phase 2) |

## 2. Enable email sign-in with a 6-digit code

The app signs in with a **6-digit email code** (the reliable mobile form of a
magic link — no fragile deep-linking into Expo Go).

1. **Authentication → Providers → Email**: make sure **Email** is enabled.
   Leave "Confirm email" on. You do **not** need a password.
2. **Authentication → Emails → Magic Link** template: the default template only
   contains a clickable link. Add the code so users can type it in. Include
   this line in the template body:

   ```html
   <p>Your sign-in code is: <strong>{{ .Token }}</strong></p>
   ```

   (Keep or remove the link — the app uses the code.)

That's it. `signInWithOtp({ email })` sends the code; the app calls
`verifyOtp({ email, token, type: 'email' })` to complete sign-in.

> Note: on the free tier Supabase's built-in email sender is rate-limited and
> meant for testing. For real use, add an SMTP provider under
> **Authentication → Emails → SMTP settings**.

## 3. Environment

The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
from `.env` (gitignored). The publishable/anon key is safe in the bundle —
**RLS is the real access control.** The secret key is only ever used
server-side inside the `lookup-food` Edge Function (Phase 4).
