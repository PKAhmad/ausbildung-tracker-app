# Cloud Sync Setup (Supabase) — one-time, ~10 minutes, free

Your app now supports login + cloud sync. You just need a free Supabase project and to paste 2 values into `index.html`. Until you do, the app still works perfectly offline (data saved on the device).

---

## Step 1 — Create a free Supabase project
1. Go to **https://supabase.com** → sign up (free).
2. Click **New Project**. Give it a name (e.g. "ausbildung"), set a database password, pick a region near you (e.g. Frankfurt). Wait ~2 min for it to build.

## Step 2 — Create the data table
1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Paste this and click **Run**:

```sql
create table if not exists tracker (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table tracker enable row level security;

create policy "own rows - select" on tracker for select using (auth.uid() = user_id);
create policy "own rows - insert" on tracker for insert with check (auth.uid() = user_id);
create policy "own rows - update" on tracker for update using (auth.uid() = user_id);
```

This creates the table and locks it so **each user can only see their own data**.

## Step 3 — Get your keys
1. Left sidebar → **Project Settings** (gear) → **API**.
2. Copy two things:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

## Step 4 — Paste them into the app
1. Open **index.html** in any text editor.
2. Near the bottom, find these two lines:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR-ANON-PUBLIC-KEY';
```

3. Replace with your real URL and anon key. Save.

> The anon public key is **safe to put in the app** — that's what it's designed for. Row-level security (Step 2) is what actually protects the data.

## Step 5 (optional) — turn off email confirmation for faster testing
By default Supabase emails a confirmation link on sign-up.
- To skip it while testing: **Authentication → Providers → Email → turn OFF "Confirm email"**.
- For real use, leave it on (more secure).

---

## Done — how it works now
- Tap **Anmelden** (top right) → register once with email + password.
- Log in on your **phone and laptop** with the same account → progress stays in sync.
- The dot on the button: **grey** = not signed in, **amber** = syncing, **teal** = synced.
- Works offline too; it syncs the moment you're back online and logged in.

## Re-host after editing
After pasting your keys, re-upload the folder to your host (Netlify/Vercel), then rebuild the APK on PWABuilder if you're using one. Bump `ausbildung-v1` → `ausbildung-v2` in `service-worker.js` so devices pick up the new version.

## Conflict note
Sync is "last save wins" per device. If you edit on two devices while offline and both come online, the most recent save overwrites. For a solo user on phone+laptop this is rarely an issue.
