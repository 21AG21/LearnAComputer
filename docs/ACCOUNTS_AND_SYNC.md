# Accounts and progress sync

Asked for: *"wire my supabase to get a login page, verification after you type
your email, save the progress"*

---

## What was there before

`@supabase/ssr` and `@supabase/supabase-js` were installed, `lib/supabase.ts`
built a browser client when the env vars existed, and `/login` had an
email-and-password form. None of it was connected: no project credentials, no
table, and nothing anywhere read or wrote progress to an account. The page said
*"Accounts aren't set up yet"* and meant it.

## The project

One Supabase project on the account — **21AG21's Project**
(`rvfdeckdhmhifsaahgpe`, us-east-2, Postgres 17.6). No tables in `public`.

Credentials went into `.env.local`, which `.gitignore` already covers via
`.env*.local`. `.env.local.example` documents the shape without the values. The
publishable key is in the browser bundle by design — it is only ever a way *in*
to row-level security, never around it, which the checks below confirm.

## The table

```sql
create table public.learner_progress (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  completed_slugs text[]      not null default '{}',
  sim_state       jsonb       not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);
```

One row per learner rather than one row per finished lesson. A sync is then one
read and one write, and signing in on a second machine cannot half-apply. The
`on delete cascade` means deleting the auth user takes the progress with it.

`sim_state` is unused today; it is there because `lac-sim` (installed practice
apps) is the obvious next thing to carry between machines, and adding a column
later to a table with rows in it is more disruptive than leaving room now.

Four policies, all `(select auth.uid()) = user_id`, one per operation. No
`using (true)` anywhere: nobody can read anybody else's progress, and the
`select`-wrapped `auth.uid()` is the form Postgres can evaluate once per query
rather than once per row.

### The advisor caught something

Supabase's security advisor flagged the `updated_at` trigger function
immediately after the migration: a `SECURITY DEFINER` function in `public` is
callable through `/rest/v1/rpc/` by anyone. Fixed:

```sql
revoke execute on function public.touch_learner_progress() from anon, authenticated, public;
```

The advisor also flags a pre-existing `public.rls_auto_enable()` with the same
problem. That one was not created by this work and was left alone —
[the linter page](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
explains the fix if it should be locked down too.

---

## Sign-in: an email and a code, no password

`/login` is three stages in one page: **email → verify → done**.

`signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo } })`
sends one message and creates the account on first use, so there is no separate
sign-up path to choose between — a beginner should not have to know whether they
are new here.

There is deliberately **no password**. This course exists because forgotten
passwords and locked accounts are how people get shut out of computers; adding
one to the course itself would be perverse. A code that expires is also safer
for someone who writes credentials on paper.

The verify stage accepts the six-digit code *and* tolerates the link, because
which one arrives depends on the email template:

- **Code**: typed into a single `one-time-code` field, verified with
  `verifyOtp({ type: "email" })`. Wrong codes get "That code did not match —
  it is six digits"; expired ones get their own message with a resend.
- **Link**: `/auth/callback` handles both shapes Supabase uses — a `code` query
  parameter exchanged with `exchangeCodeForSession`, and the older fragment flow
  where the client picks the tokens up itself — then redirects into the lessons.

Resend is rate-limited to once every 30 seconds in the UI, and "Use a different
email" goes back a stage rather than reloading.

> **To get the six-digit code into the email**, the project's *Magic Link* and
> *Confirm signup* templates need `{{ .Token }}` in them; Supabase ships them
> with `{{ .ConfirmationURL }}` only. Until that is changed the link works and
> the code field will not — which is why the verify screen tells the learner
> that clicking the link is equally fine.

## Sync: the device first, the account second

`lib/cloudProgress.ts` plus `components/AuthProvider.tsx`.

The whole site reads progress **synchronously** — a lesson page cannot await a
network round trip to decide whether a step is done — so localStorage stays the
working copy and the account is a copy of it:

| When | What happens |
|---|---|
| Sign in | `pullAndMerge`: read the row, union it with the device list, write the union back to both |
| Finish a lesson | `progress.ts` fires `lac-progress-changed`; the provider pushes after 1.5s, coalescing a burst into one write |
| Sign out | pending push is flushed first, so the last lesson finished is not lost |
| Reset | clears the device, then deletes the row — otherwise the next sign-in would pull it all straight back |

**Merging is a union, never a replacement.** Someone who works through three
units signed out and then signs in on another machine must not lose either side.
Nothing in the sync can un-complete a lesson; only Reset does that, and only
when asked.

The nav shows the signed-in address and one of *Saving… / Saved to your account /
Not saved*. "Is it actually saved?" is precisely this audience's anxiety, and a
silent sync answers it for nobody. Failures are surfaced there rather than
thrown: if the network is down, the lesson still completes locally and the state
reads "Not saved".

---

## Verified

Against the live project:

| Check | Result |
|---|---|
| `/auth/v1/settings` | `external.email: true`, `disable_signup: false`, `mailer_autoconfirm: false` — email sign-up is on and confirmation is required |
| Anonymous `GET /rest/v1/learner_progress` | `[]` — no rows leak |
| Anonymous `POST` with a made-up `user_id` | `42501 new row violates row-level security policy` |
| `/login` with the env vars present | renders the email stage, no "accounts are not switched on" notice |
| Submitting `not-an-address@invalid` | the server's own rejection renders in the form; the request reached the auth endpoint |
| `/auth/callback?error_description=…` | shows "That did not work" with a link back, no console errors |
| Security advisor after the migration | one warning, on the trigger function, fixed by revoking execute |

`npx tsc --noEmit`, `npm run lint`, `check-lessons.py` and `npm run build` clean.

## Not verified, and why

**No email was sent.** The only real address available is the account owner's,
and sending sign-in mail to somebody's inbox is not mine to do uninvited —
particularly when I cannot read the inbox, so it would prove nothing beyond the
`/auth/v1/settings` result already above.

That leaves three things to confirm by signing in once:

1. Whether the email arrives with a **code**, a **link**, or both — see the
   template note above.
2. The merge on first sign-in — finish a lesson signed out, then sign in, and
   both should be there.
3. The redirect target. `emailRedirectTo` is built from `window.location.origin`,
   so the deployed domain and `http://localhost:3000` must both be listed under
   **Authentication → URL Configuration → Redirect URLs** in the Supabase
   dashboard, or the link will bounce.

## Still open

- **`sim_state` is written by nothing.** The column exists; carrying `lac-sim`
  across machines is a separate change.
- **No server-side session.** Everything is client-side, which suits a static
  site with no protected pages — nothing on the site is gated behind sign-in, so
  there is nothing for a server session to protect yet.
- **Conflict resolution is a union.** If the same account is used on two machines
  at once, both sets of finished lessons survive. For progress that is the right
  answer; for anything with an order or a value it would not be.
