# Catalog audit

A pass over all 174 lessons looking for three things: content that exists twice,
ordering that does not survive reading top to bottom, and units that teach a
skill without ever asking the learner to try it on their own machine.

Run the checks yourself:

```bash
python3 scripts/check-lessons.py
```

---

## Duplicates

### Searching Your Photos, twice — fixed

Two Unit 7 lessons carried the same title and taught the same thing:

| Slug | Order | Module | Steps |
|---|---|---|---|
| `photo-search` | 702 | Your Photo Library | 2 — open search, type "beach" |
| `photo-people` | 711 | Organizing Photos | 4 — open search, type "dog", open the result, favorite it |

`photo-search` was the thinner of the two and sat in the wrong module —
searching is organizing, not browsing. Deleted. `photo-people` kept and
retitled to **Finding a photo by searching**, which is what it teaches. Its
slug still reads `photo-people`, which is a legacy of an earlier plan, but
slugs are never renamed: progress is stored by slug, and renaming one silently
un-completes it for every learner who had finished it.

### Accessibility, twice — fixed during Unit 13

`accessibility.json` (Unit 9, order 910) taught Text Size and Bold Text in three
steps. Unit 13 now covers both across two lessons with more room, plus eight
settings that did not previously exist. The Unit 9 lesson was deleted rather
than left as a stub. Recorded in `docs/UNIT13_ACCESSIBILITY.md`.

### Two lessons called "Now set up your own computer" — fixed

Unit 9's real-world lesson and Unit 13's had the same title. Unit 13's is now
**Now adjust your own computer**. The pattern repeating across units is
deliberate; the identical title was not.

---

## Ordering

No collisions. Every unit occupies a clean, non-overlapping span, and the spans
run in reading order:

```
    1–60    Unit 1: Meet Your Laptop
  200–296   Unit 2: Keyboard and Typing
  300–391   Unit 3: Files and Folders
  400–499   Unit 4: The Internet and Browsing
  500–570   Unit 5: Messages and Video Calls
  600–681   Unit 6: Email
  700–781   Unit 7: Photos
  800–871   Unit 8: Apps
  900–961   Unit 9: System Settings
 1000–1101  Unit 10: Online Safety and Security
 1110–1191  Unit 11: Troubleshooting
 1210–1290  Unit 12: Everyday Life with Your Computer
 1310–1361  Unit 13: Making Your Computer Easier to Use
      1500  Final Capstone
```

Two changes were needed:

- The **Final Capstone moved from 1300 to 1500**. Unit 13 lands in the 1310s, so
  at 1300 the capstone would have appeared *before* the last unit of the course.
- **Unit 4's assessment moved 499 → 498** so its new real-world lesson could take
  499 without colliding with Unit 5's first lesson at 500.

One typo fixed: the Unit 9 module was named "Customizing Your computer" with a
lowercase c. Module names become URL slugs, but progress keys off the lesson
slug, so the rename is safe.

---

## "Now do it on your own computer"

This was the real gap. Seven of the thirteen units taught a skill entirely
inside the simulator and never asked the learner to open their own machine.

**Before:**

| Unit | Real-world lessons |
|---|---|
| 1 Meet Your Laptop | 4 |
| 2 Keyboard and Typing | **0** |
| 3 Files and Folders | 2 |
| 4 Internet and Browsing | **0** |
| 5 Messages and Video Calls | 2 |
| 6 Email | **0** |
| 7 Photos | **0** |
| 8 Apps | **0** |
| 9 System Settings | 1 |
| 10 Online Safety | **0** |
| 11 Troubleshooting | **0** |
| 12 Everyday Life | 7 |
| 13 Accessibility | 2 |

Seven lessons added, one to the end of each gap unit's assessment module:

| Slug | Order | What it asks for |
|---|---|---|
| `unit-2-assessment-real` | 296 | Type, select with Shift, copy, paste, undo — in any real program |
| `unit-4-assessment-real` | 499 | Type an address, open a second tab, check the padlock, close tabs |
| `unit-6-assessment-real` | 681 | Send one real email with a useful subject and an attachment |
| `unit-7-assessment-real` | 781 | Favorite a photo, build an album, edit one, delete and find it again |
| `unit-8-assessment-real` | 871 | Install something wanted, read its permissions, delete something unused |
| `unit-10-assessment-real` | 1101 | Turn on two-factor, change a reused password, inspect a link without clicking |
| `unit-11-assessment-real` | 1191 | Force-quit instead of holding power, test other sites, record error codes |

Every unit now has at least one. Each is a reading lesson (`type: "none"`) that
names four concrete actions rather than saying "try it yourself" — a learner who
is told to practice without being told what to practice does not practice.

---

## Still open

These were found and are **not** fixed here. They belong to the Units 2–12 audit.

### Unit 12 is almost entirely read-only

Seven of its modules contain no activity at all:

- Social and Entertainment (1 lesson)
- Finding Your Way (1)
- Creating Content (1)
- Documents in the Cloud (3)
- Online Services (1)
- Smart Features (1)
- Real-World Tasks (2)
- Unit 12 Assessment (1)

The unit promises practice it does not deliver. Its assessment is a reading
lesson, which is the sharpest version of the problem.

Also read-only: Unit 7's *Cloud Storage* and Unit 8's *Apps vs Websites*,
one lesson each.

### Thirty-two single-lesson modules

A module is a page, so a single-lesson module is a page with one step and a
"next module" button. Unit 12 has seven of them and Unit 2 has five. Some are
legitimately one idea; most should merge with a neighbor.

### Three built playground types no lesson uses

`drag-sort-files`, `spot-the-fake` and `url-navigator` are wired into
`LessonPlaygroundPane` and validated in `TaskChecker`, but nothing references
them. Either Unit 12 should use them — a drag-sort of everyday files, a
spot-the-fake shopping site — or they should be deleted.
