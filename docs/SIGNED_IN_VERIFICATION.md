# Verifying the signed-in half of the product

Everything a signed-out learner touches is proven by machine: `solve-check`
(132 activities), `mission-check` (18 missions), `demo-check`, `desktop-check`,
`hostile-check`. **The signed-in half is not**, and this document exists so
nobody mistakes silence for proof.

## Why it is not automated

Signing in needs a one-time code delivered to a real inbox. An automated agent
cannot complete that round trip, and should not: creating accounts and handling
credentials is the account holder's job, not a script's. So the parts below are
verified by a person, once, in about ten minutes — and by the SQL in §3, which
proves the security boundary without needing anyone to sign in at all.

Do this **after** applying
`supabase/migrations/20260728_classes_and_instructor_visibility.sql`, and
before telling any buyer the classroom feature exists.

## 1. Progress sync (10 minutes, two browsers)

Use two different browsers, or one plus a private window — not two tabs.

| # | Do this | Expect |
|---|---|---|
| 1 | Browser A, signed out: finish two lessons | Catalog shows 2 done |
| 2 | Sign in as yourself | Nav shows your email; no progress lost |
| 3 | Finish a third lesson, wait ~3 seconds | Sync indicator settles |
| 4 | Browser B: sign in as the **same** account | All three lessons show as finished |
| 5 | Browser B: finish a fourth. Return to A and reload | A shows four — the merge is a **union** |
| 6 | Browser A: **Reset all progress** | Both the device and the account are cleared |
| 7 | Reload B | Nothing comes back. Reset must not resurrect from the cloud |

Step 5 is the one that matters: progress must never be *replaced*, only merged.
Somebody who worked through three units signed out, then signs in on another
machine, must lose neither side.

Step 7 is the second: if reset only cleared the device, signing in again would
undo it, and "delete my data" would be a lie.

## 2. Classes (10 minutes, two accounts)

You need a second account — a second email address is enough.

| # | Do this | Expect |
|---|---|---|
| 1 | Account A: open `/instructor`, make a class | A six-character code appears, no O/0 or I/1 |
| 2 | Account A: reload | The class is still there with the same code |
| 3 | Account B: open `/join`, type the code and a name | "You are in — <class name>" |
| 4 | Account A: reload `/instructor` | B appears on the roster under the name **B chose** |
| 5 | Account B: finish a lesson, wait ~3s. A reloads | B's progress bar moves |
| 6 | Account B: `/join` → **Leave** | Gone from A's roster; B's own progress untouched |
| 7 | Account B: type a code that does not exist | A plain message, not a stack trace |
| 8 | Account A: **Delete class** | Roster gone; B keeps every finished lesson |

Also confirm the thing the privacy page promises: **A can see B's chosen name
and finished lessons, and nothing else.** No email address anywhere on the
roster.

## 3. Proving the security boundary without signing in

The rules that matter are enforced by Postgres, not by the browser, so they can
be tested directly. Paste this into the Supabase SQL editor. It impersonates
two learners and asserts that neither can read the other.

```sql
-- Two real user ids from auth.users (or any two uuids that own progress rows).
-- Replace both before running.
\set a '00000000-0000-0000-0000-00000000000a'
\set b '00000000-0000-0000-0000-00000000000b'

begin;
-- Become learner A.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'a', 'role', 'authenticated')::text, true);
set local role authenticated;

-- A sees exactly one progress row: their own.
select 'A sees rows: ' || count(*)::text from public.learner_progress;
-- A sees no classes they do not own.
select 'A sees classes: ' || count(*)::text from public.classes;
rollback;
```

Run it again with `:b` substituted. Each learner must see **one** progress row
and only their own classes. If either number is larger, stop and do not ship
the feature — that is a data leak, not a bug.

To prove the instructor path deliberately *does* open up, have B join A's class
first, then run the block as A: A should now see **two** progress rows, and
running it as B must still show one.

## 4. What is still not covered, even after all this

- **Deliverability.** Whether the sign-in code actually arrives in a care
  home's spam-filtered mailbox is a mail-server question, not a code question.
  Test it once against the customer's real domain before a pilot.
- **Two people on one machine.** Shared-machine sign-out hygiene is covered by
  the implementation guide, not by any check here.
- **Scale.** The roster query is two reads; it has never been run against a
  hundred learners.

Record the date this was last run, and by whom, so a future session can tell
proof from assumption:

| Date | Who | Sync §1 | Classes §2 | RLS §3 |
|---|---|---|---|---|
| _not yet run_ | | | | |
