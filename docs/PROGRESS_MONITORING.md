# Progress Monitoring Design Document

**Status: Design only — nothing in this document is implemented. Do not add code based on this document without a separate implementation plan approved by the user.**

---

## 1. Today's model

Progress is stored entirely in the browser's `localStorage` on two keys:

| Key | Schema | Managed by |
|---|---|---|
| `lac-progress` | `{ version: 1, completedSlugs: string[] }` | `lib/progress.ts` |
| `lac-sim` | JSON object with namespaced sub-keys (e.g. `lac-sim-apps`) | `lib/simState.ts` |

`markComplete(slug)` in `lib/progress.ts` appends to `completedSlugs`. `getCompletedSlugs()` reads it. The dashboard's "Reset all progress" button clears both keys.

**Limits of this model:**
- Per-device, per-browser: switching devices or browsers loses all progress.
- Lost on browser cache clear or private browsing.
- Invisible to a parent, teacher, or supervisor.
- No timestamps, no failure counts, no time-spent data.
- No way to sync between a school tablet and a home computer.

---

## 2. What we want to know

Per learner, per lesson:

| Signal | Where it already exists | Status |
|---|---|---|
| Lesson completed | `markComplete(slug)` | Stored in `localStorage` |
| Lesson started | (not captured) | Not implemented |
| Time spent per lesson | (not captured) | Not implemented |
| Failed attempts | `onResult(false, failMessage)` in every playground | Signal exists but is discarded |
| Skipped via "Skip this activity" | `handleNext()` without `onResult` | Not distinguished from completion |
| Module abandoned (quit mid-way) | (not captured) | Not implemented |

The `onResult(false, failMessage?)` channel already fires on wrong phishing verdicts, clicking CLEAN NOW in the scam popup, and wrong ad clicks in assessment mode. The signal is simply discarded today — it is never written to `localStorage`.

---

## 3. Proposed Supabase schema

### Tables

```sql
-- One row per registered user
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  role       text NOT NULL CHECK (role IN ('learner', 'supervisor')) DEFAULT 'learner',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per learner action on a lesson
CREATE TABLE lesson_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  lesson_slug  text NOT NULL,
  module_slug  text NOT NULL,
  event_type   text NOT NULL CHECK (event_type IN ('started', 'completed', 'failed', 'skipped')),
  duration_ms  int,           -- null if not measured
  fail_message text,          -- populated when event_type = 'failed'
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- A supervisor (parent, teacher) linked to a learner
CREATE TABLE supervisor_links (
  supervisor_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  learner_id    uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (supervisor_id, learner_id)
);
```

### Row-Level Security policies

```sql
-- profiles: users read/write their own row only
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_self ON profiles
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- lesson_events: learners write only their own rows; supervisors read linked learners
ALTER TABLE lesson_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_write_own ON lesson_events
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY events_read_own ON lesson_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY events_supervisor_read ON lesson_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM supervisor_links
      WHERE supervisor_id = auth.uid() AND learner_id = lesson_events.user_id
    )
  );

-- supervisor_links: supervisors manage their own links; learners read links that name them
ALTER TABLE supervisor_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY links_supervisor ON supervisor_links
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());
CREATE POLICY links_learner_read ON supervisor_links
  FOR SELECT USING (learner_id = auth.uid());
```

---

## 4. Sync strategy

`localStorage` stays the write-ahead source of truth so the app works offline and while signed out.

**On sign-in:** replay unsynced `lac-progress` completedSlugs to Supabase as `completed` events. Mark events with the current timestamp (the exact completion time is unknown). Write a `lac-sync-cursor` key to `localStorage` recording the last-synced slug index so replays are idempotent.

**Reconciliation:** on load, take the union of `completedSlugs` from `localStorage` and the `completed` events in Supabase. Completion is monotonic — once completed, always completed — so union is always safe and needs no conflict resolution.

**Failed / skipped events:** these are more ephemeral and do not need to reconcile. Write them to Supabase immediately if signed in; discard them if offline. The learner's offline experience is unaffected.

**Never block the lesson on a sync failure.** If the Supabase write fails, log the error and continue. The `localStorage` copy is always authoritative for the learner's own device.

---

## 5. The supervisor view

What a parent or teacher needs to see:

- **Learner list.** Each linked learner's display name, last-active timestamp, and a single progress bar (n of total lessons complete).
- **Per-unit progress bars.** For each unit in the course, the fraction of lessons the learner has completed.
- **"Stuck here" list.** Lessons where `failed` events outnumber `completed` events 3:1 or more, without a recent `completed`. These are the places where the learner may need help.
- **Last active.** `MAX(created_at)` across all `lesson_events` for the learner.
- **No raw message content or personally identifying data** beyond display name and progress.

---

## 6. Privacy

Learners are likely minors. Design choices that follow from this:

- **Data minimization.** `lesson_events` contains only lesson identifiers, timing, and failure messages (which are generated by the app, never typed by the learner). No freeform text from the learner is stored server-side.
- **No behavioral analytics.** No Mixpanel, Amplitude, Segment, or similar, and no advertising or social pixels. Page-view counting comes from Vercel, the host, which is cookieless, assigns no visitor identifier, and never receives lesson content or progress. Everything else flows only to our own Supabase project. `app/privacy/page.tsx` states this in plain language and must be kept true.
- **Explicit linking only.** A supervisor is added by entering a link code or invite URL that the learner (or their guardian) shares. The supervisor cannot find a learner by email or name. There is no "search for users" feature.
- **Deletion path.** A learner can delete their account from Settings. This cascades through `lesson_events` and `supervisor_links` via `ON DELETE CASCADE`. Data is purged from Supabase; `localStorage` is cleared client-side.
- **Signed-out learners keep all functionality.** Using the app without an account produces no server-side data at all.

---

## 7. Open questions (for the user to decide)

1. **Supervisor self-registration or invite?** Can a supervisor create an account independently and then find learners by invite code? Or must a learner's guardian create the supervisor account too? The current schema supports both, but the UX flow is TBD.

2. **Classroom / group concept?** Is there a concept above the 1:1 supervisor–learner link? For example, a teacher with a class of 20 learners. The current schema has no `groups` table. Adding one would require a migration and a different supervisor view.

3. **Event history retention.** How long should `lesson_events` rows be kept? Indefinitely is cheapest to build and fine for small scale; a 90-day rolling window would cap storage costs at large scale.

4. **Sync on mobile browsers.** Mobile browsers aggressively evict `localStorage` when storage is low. Should the app proactively push completed slugs to Supabase when the learner is signed in, rather than waiting for sign-in to replay? (This would mean signed-in learners always have a server backup, while signed-out learners remain at risk of losing progress.)
