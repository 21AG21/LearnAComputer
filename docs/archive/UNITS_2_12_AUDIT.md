# Units 2–12 audit

The same treatment Unit 1 got, applied to the rest of the course. Unit 1's
problems were mostly *structural* — apps that were not windows, a Files app with
three fewer buttons than the one Unit 3 taught. Those were fixed globally in
`docs/UI_UNIFICATION.md`, so every unit already inherited them.

What remained was **curricular**: units that talked about a skill without ever
asking for it, modules with one lesson in them, and three activity types that
were built, wired and never used.

---

## The inventory

Dumped before touching anything:

| Unit | Lessons | Read-only | Modules | Single-lesson modules |
|---|---|---|---|---|
| 2 Keyboard and Typing | 23 | 5 | 8 | 4 |
| 3 Files and Folders | 11 | 1 | 3 | 0 |
| 4 Internet and Browsing | 18 | 1 | 4 | 0 |
| 5 Messages and Video Calls | 8 | 0 | 3 | 1 |
| 6 Email | 10 | 1 | 5 | 1 |
| 7 Photos | 10 | 2 | 5 | 1 |
| 8 Apps | 9 | 2 | 4 | 1 |
| 9 System Settings | 7 | 1 | 5 | 3 |
| 10 Online Safety | 12 | 1 | 5 | 0 |
| 11 Troubleshooting | 10 | 3 | 6 | 3 |
| **12 Everyday Life** | **12** | **11** | **9** | **7** |

Units 3, 4, 5 and 10 needed nothing structural — they are hands-on throughout,
with sensible module sizes. The work concentrated in 12, then 9, 11 and 2.

---

## Unit 12 was the problem

Eleven of its twelve lessons had `playgroundTask: {"type": "none"}`. Every one
of them said some version of *"try it on your own computer"* and then stopped.

That is not the same failure as a lesson that promises practice and omits it —
these lessons were **honestly** real-world lessons. The failure is that Unit 12
had *only* real-world lessons. A learner who has never opened a map, downloaded
a PDF, or looked at a shop's web address is being asked to do all three
unpractised, on their own machine, with no safe rehearsal.

The rest of the course uses a pattern: practice it in the simulator, then do it
for real. Unit 12 skipped the first half.

### Rebuilt

Nine modules became five, and six practice lessons were added ahead of the
existing real-world ones. **Every original lesson was kept, with its slug** —
they moved module and order, which is safe, rather than being deleted, which
would have un-completed them for anyone mid-course.

| Module | Practice | Then do it for real |
|---|---|---|
| Out and About | `maps-practice` — type maps.google.com into an address bar | `maps-navigation` |
| | `qr-practice` — a QR code contains an address; type the one it holds | `qrcodes-siri` |
| Shopping and Money | `shopping-spot-fake` — three shops, one fake, read the addresses | `shopping-banking` |
| Documents and Printing | `notes-save-practice` — save a note into Documents with a real name | `notes-documents` |
| | `cloud-vs-computer` — sort six items into on-this-computer vs in-the-cloud | the three Google Docs/Drive lessons |
| | `pdf-practice` — download a PDF, find it, open it, zoom it | `pdfs-reading`, `printing-scanning` |
| Staying in Touch | — | `calendar-reminders`, `social-media` |
| Unit 12 Assessment | `unit-12-assessment-sim` — the whole errand, assessment mode | `unit-12-assessment` |

The assessment was itself a reading lesson. It is now a six-objective
`guided-browser` assessment — timetable, download, find it, open it, check the
padlock — followed by the original real-world checklist.

### The three orphaned activity types

`drag-sort-files`, `spot-the-fake` and `url-navigator` were built, wired into
`LessonPlaygroundPane`, validated in `TaskChecker` — and used by no lesson.
Rather than delete working code, Unit 12 now uses all three, and they happen to
be exactly the right shape for its content:

- `url-navigator` → typing a map address, and typing the address a QR code holds.
- `spot-the-fake` → three shops, one with a zero for an "o" and a `.xyz` ending.
- `drag-sort-files` → on this computer, or in the cloud?

Zero unused playground types remain.

---

## Single-lesson modules: 32 → 5

A module is a page. A single-lesson module is a page with one step and a "next
module" button, which reads as a stutter rather than a chapter.

| Unit | Before | After |
|---|---|---|
| 2 | Selecting Text, Editing, Text Formatting, Keyboard Shortcuts, Navigation | **Editing Text** (3), **Shortcuts and Navigation** (3) |
| 9 | Customizing Your Computer, Appearance, Connections, System Behavior | **Getting Around Settings** (2), **Connections and Behavior** (3) |
| 11 | Performance, Access Issues, Getting Support | **When You Are Stuck** (3) |
| 7 | Cloud Storage (1, read-only) | folded into **Organizing Photos** |
| 8 | Apps vs Websites (1, read-only) | folded into **Getting Apps** |
| 6 | Email Safety (1), Email Documents (1) | **Managing and Staying Safe** (2), attachments into **Composing Email** |

Module names are URL slugs, but progress keys off the *lesson* slug, so
renaming and regrouping modules is safe. No lesson slug changed.

The five that remain are single on purpose: a graduation page, a unit
introduction, one self-contained window-management module, and two ends of the
final assessment.

**Read-only modules: 12 → 2**, and both survivors are reading pages by design.

---

## Two more real-world lessons

The catalog audit added these to seven units. Two assessment modules were still
one lesson long and had no real-world partner:

- `unit-1-assessment-real` — move a window, resize it, hide and restore it, find
  the clock and battery on your own screen.
- `unit-5-assessment-real` — send one real message, react rather than reply,
  send a photo, and find the mute button *before* the call needs it.

---

## A bug found while verifying

Adding site-wide dark mode set `dark:text-gray-100` on `<body>`. The simulated
computer deliberately stays light — its appearance is a lesson subject — but
text color cascades, so any playground component relying on *inherited* color
rendered light-gray on white. It was invisible on the spot-the-fake cards.

Fixed at the two playground roots (`LessonPlaygroundPane` and
`/playground`) with an explicit `text-gray-900`, rather than in each of the
thirty-odd components that would otherwise need it.

This is exactly why the verification pass runs in a browser rather than against
a type-checker: nothing about it was a type error, a lint error, or a failing
build.

---

## After

- **197 lessons**, 63 modules, 14 units.
- **152 hands-on, 45 reading.** Every unit has at least one of each.
- Every unit ends with a real-world lesson naming concrete actions.
- No duplicate titles, no order collisions, no unused playground types.

## Verified in the browser

- Unit 12 *Documents and Printing* opens on the dock with the Files icon
  glowing, as every other guided lesson does.
- *Which shop is real?* renders three readable cards, accepts the click on the
  fake, and shows the explanation naming all three giveaways.
- The text-color fix confirmed by reloading the same lesson in dark mode.

`npx tsc --noEmit`, `npm run lint` (0 errors), `scripts/check-lessons.py`
(197 lessons) and `npm run build` all clean.
