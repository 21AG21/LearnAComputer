# Real-world missions

Asked for: *"build something like organize this folder, where you download a
folder and have to organize it on your own computer, for one of the IRL
activities as the final assessment for the files unit. Then do something that
creative and that smart for the other final assessments for the units."*

---

## What was there before

Every unit already ended with a "now do it on your own computer" lesson. All
fourteen of them were `playgroundTask: {"type": "none"}` — a paragraph of
instructions and a Continue button.

```json
{ "slug": "unit-3-assessment-real",
  "drDigitalIntro": "1. Open your real Downloads folder…\n5. Delete something…",
  "playgroundTask": { "type": "none" } }
```

The advice was sound. The problem is that a page which cannot tell whether you
did any of it is not an assessment, it is a poster. Nothing distinguished the
learner who did all five steps from the one who clicked Continue.

## What replaced it

A new playground type, `real-world`, that **checks the learner's own machine**.
Thirteen kinds of check, every one of them running in the browser, on the
learner's device, with nothing uploaded anywhere:

| Check | What it actually reads | Used by |
|---|---|---|
| `folder` | the names and paths inside a folder they pick | Unit 3 |
| `file` | name, size, type, last-modified, image dimensions | Units 4, 5, 7, 12, Final |
| `download` | that the real file link was used | Units 3, 4 |
| `paste` | a `paste` event carrying text they did not type | Units 2, 6, 12, Final |
| `window-max` | `innerWidth` against `screen.availWidth` | Unit 1, Final |
| `zoom` | `devicePixelRatio` against its value at mount | Unit 13 |
| `dark-mode` | `prefers-color-scheme` changing | Unit 9 |
| `reduce-motion` | `prefers-reduced-motion` changing | Unit 13 |
| `offline` / `online` | `navigator.onLine` and its events | Unit 11 |
| `type-answer` | an answer against the Battery API, `location.hostname`, or the user agent | Units 1, 4, 8, 10, Final |
| `keys` | a real key combination on the real keyboard | Unit 2 |
| `confirm` | nothing — and says so | everywhere |

`confirm` is the honest floor. Some things genuinely cannot be observed from a
web page — whether you sent your sister a message, whether you read an app's
permissions — and those steps say *"This one is on your honor"* in as many
words rather than pretending to check.

---

## The flagship: Unit 3

**`unit-3-assessment-real` — "Mission: sort a real folder"**, eight steps.

1. Download `messy-folder.zip` — a real zip of **fifteen real files**.
2. Unzip it. 3. Look inside. 4. Make three folders. 5. Sort every file.
6. Open `scan0001.pdf`, find out what it is, rename it accordingly.
7. Delete the three junk files. 8. **Hand the folder back to be checked.**

### The files are real files

`scripts/make-mission-folder.py` builds the zip. Nothing in it is a placeholder:

- **4 pictures** drawn with PIL — a beach, a garden, a cake, a screenshot —
  saved as genuine JPEG and PNG.
- **4 text files** with real content: questions for the doctor, a letter to the
  council about a streetlight, book club notes, a packing list.
- **3 PDFs** written by hand, byte by byte, because no dependency was going to
  do it: an electricity bill, a kettle receipt, and a council tax bill. They are
  valid PDFs — verified by rendering one through the operating system's own
  QuickLook, which produced the expected page.
- **3 junk files**: two empty, and `download (1).csv` which is byte-for-byte the
  same as `budget-2025.csv`.

Placeholders would have collapsed the moment somebody double-clicked one, and
step 6 asks them to open a file and read it.

### The trap that teaches the lesson

Two files look almost identical from their names:

| File | What it is | What to do |
|---|---|---|
| `Untitled document (2).txt` | questions for a doctor's appointment | **keep** |
| `Copy of Copy of Untitled.txt` | empty | delete |

The only way to tell them apart is to open them. That is the entire point of the
unit, compressed into two filenames. The brief names all three junk files
exactly, so nobody is guessing — and if the doctor's note gets deleted anyway,
the checker says *"I cannot find 'Untitled document (2).txt' anywhere. Did it get
deleted by mistake? Check your trash."*

### The check

`checkOrganizedFolder` in `TaskChecker.ts` is a pure function over the list of
paths. It reports what is right as well as what is wrong, so a near-miss does
not read as a failure:

```
✓ Folder "Photos" exists      ✓ 10 of 11 files are in the right folder
✗ "beach-day.jpg" is in Documents — it belongs in Photos.
✗ "New Text Document.txt" is still here. That one was junk — delete it.
✗ "scan0001.pdf" still has its old name. Open it, see what it is, and rename it.
```

Deliberate tolerances, each for a reason:

- **Case-insensitive folder names.** `photos` is not a mistake worth failing.
- **`.DS_Store`, `Thumbs.db`, `desktop.ini`, `._*` ignored.** The file manager
  wrote those, not the learner.
- **The chosen folder's own name is stripped**, and if they hand back the folder
  *containing* their work, a second common root is stripped too. Picking one
  level too high is the most likely mistake and it should not cost anything.
- **The renamed file is identified by elimination**, not by name — any name is
  accepted except ones that still say nothing (`^(scan|img|dsc|untitled|new|copy|document\d|file|doc\d)`),
  which get *"'document1.pdf' still does not say what the file is."*

### Tested against thirteen trees

`checkOrganizedFolder` was compiled out and run in node against synthetic
folders. All pass:

| Case | Result |
|---|---|
| Perfect tree | passes |
| Parent folder handed back instead | passes |
| `photos` in lower case | passes |
| A file left loose at the top | named and caught |
| A file in the wrong folder | named, with where it should be |
| Junk that survived | named |
| `scan0001.pdf` not renamed | caught |
| Renamed to `document1.pdf` | caught, with why |
| Renamed file missing entirely | caught |
| A wanted file deleted by mistake | caught, points at the trash |
| A completely unrelated folder | "None of the practice files are in there" |
| An empty folder | "That folder is empty" |
| The zip untouched | "There are no folders in here yet" |

Then driven through the real UI: a wrong tree produced the red panel above, and
the correct tree produced the completion banner.

---

## The other thirteen

Each unit's mission checks whatever that unit is actually about.

| Unit | Mission | What is genuinely verified |
|---|---|---|
| 1 Meet Your Laptop | **your own machine** | window shrunk then filled; the battery percentage they read off their own screen, checked against the Battery API |
| 2 Keyboard | **type it, then move it** | text arriving by paste rather than typing; a real Ctrl+A |
| 3 Files | **sort a real folder** | the whole folder, file by file |
| 4 Internet | **find what you downloaded** | this page's real hostname; the downloaded file handed back **by name** |
| 5 Messages | **reach a real person** | a screenshot made in the last 30 minutes |
| 6 Email | **a real email, sent and found** | the subject line pasted back from their mailbox |
| 7 Photos | **your own photos, measured** | one landscape and one portrait photo, by real pixel dimensions; a photo renamed away from `IMG_`/`DSC_` |
| 8 Apps | **the apps you already have** | the name of the browser they are using, against the user agent |
| 9 Settings | **a setting this page can see** | dark mode changed in the operating system |
| 10 Online Safety | **check your own accounts** | the real address bar |
| 11 Troubleshooting | **break it on purpose** | WiFi actually going down, and coming back |
| 12 Everyday Life | **a real errand** | a URL pasted from another page; a PDF saved in the last 45 minutes |
| 13 Accessibility | **your own computer** | real browser zoom in and back; Reduce Motion changed in the OS |
| Final | **not a simulation** | window, hostname, a pasted URL, a fresh PDF, a fresh screenshot |

Three of these deserve calling out:

**Unit 11 turns the assessment into a fire drill.** "Turn your WiFi off" — and
the page notices, because it is watching `navigator.onLine`. The lesson keeps
working while offline, which is worth seeing for yourself. Then turn it back on,
then force quit an app *while nothing is wrong with it*, so the day something is
wrong you have already done it once.

**Unit 9 makes a system setting visible.** The learner changes dark mode in their
computer's own settings and a box on the page changes by itself. It is a small
piece of magic that carries a real idea: some of your preferences are handed to
every website you visit.

**Unit 4 closes the loop that beginners lose things in.** Download a file, then
find it again — and the check knows the difference between the right file and any
other PDF, because it compares the name.

---

## Discoverability, enforced

The rule from `docs/DISCOVERABILITY_AUDIT.md` — *hide where the controls are,
never hide which thing to act on* — applies with more force here, because a
mission failure arrives after twenty minutes of real work rather than after a
misclick.

`scripts/check-lessons.py` now fails the build when a mission checks for
something it never told the learner:

```
UNGIVEN MISSION VALUE: <slug> checks for a folder called 'Money',
which the lesson never states
MISSING ASSET: <slug> offers 'x.zip' but public/missions/x.zip does not exist
```

It covers folder names, the junk files to delete, the file to rename, and any
`nameIs` file — and it checks that every offered download actually exists. Proved
by breaking `Money` into `Wallet` on purpose and watching the build fail.

---

## Two bugs found by driving it

Both were the same mistake, and neither would have been caught by a type-checker,
a linter or a build:

1. **`window-max` only listened for `resize`.** The window's size changed and the
   step never noticed. In a real drag the event does fire — but not when a window
   moves to a second screen, which changes what "fills the screen" means.
2. **`dark-mode` only listened for the media query's `change` event.**
   `matchMedia('(prefers-color-scheme: dark)').matches` flipped to `true` while
   the card still read `Off`.

Both now poll alongside their event. A check that silently never fires is worse
than a slightly busier timer: the learner does the thing correctly, sees nothing
happen, and concludes they did it wrong.

---

## Privacy

This is the first thing in the course that touches the learner's own files, so
it is stated on the cards themselves and in `/privacy`:

- A folder pick hands over **names and paths only**.
- A file pick hands over name, size, type, date, and — for pictures — width and
  height, read here to tell them the shape.
- Nothing is uploaded. There is no endpoint to upload to.

The wording on the file card was corrected during the work: it originally said
the page "never opens" the file, which is not true of an image whose dimensions
are being measured. It now says the file never leaves the computer, which is.

---

## Verified in the browser

Driven at 1680×900 and 2560×1400, in light and dark:

- **Unit 3**, end to end: download → six confirms → a wrong tree (three specific
  complaints, "Check it again") → the correct tree → completion.
- **Unit 1**: window check refused to pass while the window was already full,
  passed after shrink-then-fill; a wrong battery number was refused with *"That
  is not what I measure"*, the real 100% passed.
- **Unit 2**: typing into the paste box did nothing; a nine-character paste was
  refused; the 44-character sentence passed; a wrong shortcut was ignored and
  Ctrl+A advanced.
- **Unit 4**: a wrong hostname refused; `holiday.pdf` refused by name with the
  name it wanted; `Downloads-Practice.pdf` accepted.
- **Unit 9**: the card read "On", the system preference was flipped, the step
  passed on its own.
- **Unit 11**: offline advanced step 1, online advanced step 2.
- **Unit 13**: the zoom card reads a live percentage.

`reduce-motion` shares its component and code path with `dark-mode`, which was
driven; the query string is the only difference.

## Proven by machine: `npm run mission-check`

Hand-driving proves a mission once. Missions are exempt from solve-check —
their steps are satisfied outside the page, so the in-page solver has nothing
to click — which left all eighteen unguarded against every later change, and
left four converted Unit 12 lessons never driven at all.

`scripts/mission-check.mjs` closes that. It does not mock the checks or the
page; it plays the learner's **computer**, through `/dev/mission-check`:

| Check | What the harness really supplies |
|---|---|
| `file` | A PNG encoded on the spot at real pixel dimensions, so landscape vs portrait is decided by real geometry; real PDF bytes; a fresh mtime for `recentMinutes` |
| `folder` | A correctly-sorted tree written to disk and handed to the same `webkitdirectory` input a learner uses |
| `paste` | A genuine `paste` event carrying a `DataTransfer`, not a typed value |
| `keys` | A real key combination through the browser's input pipeline |
| `window-max` | CDP moving the window and the screen independently |
| `zoom` | CDP changing the device pixel ratio for real — the earlier note here that automation could not do this was wrong |
| `dark-mode` / `reduce-motion` | The media query actually flipped mid-step |
| `offline` / `online` | The context's network actually cut |
| `download` | The click, plus reading the delivered bytes to prove the file is not empty |

Two harness bugs were caught before they could libel the product: clicking
server-rendered HTML before React hydrated made every mission look stuck, and
headless Chromium reports `screen.availWidth` as the viewport, which makes
"smaller than the screen" impossible to satisfy. Both were the harness lying,
not the course failing — the distinction is the whole value of the tool.

A negative control keeps it honest: hand the portrait step a wide photo and
the run fails, with the check's own words on screen.

`npx tsc --noEmit`, `npm run lint`, `scripts/check-lessons.py` (198 lessons) and
`npm run build` all clean.

---

## Still open

- **Mission state does not survive a page reload.** Switching to another app to
  do the work is fine — that is the normal case — but a refresh restarts the
  mission. The confirm steps click through quickly, so this was left alone rather
  than adding session storage to every step.
- **Folder picking needs a desktop browser.** Phones cannot hand a folder to a
  web page. The button disables itself and says so.
- **The Battery API is Chrome-only.** Elsewhere the step says plainly that it
  cannot check the answer and takes the learner's word for it.
