# Unit 13 — Making Your Computer Easier to Use

Sixteen lessons on accessibility settings, and the simulator work needed to make
them real rather than described.

## Why it is its own unit

Accessibility had one lesson in the whole course — `accessibility.json`, Unit 9,
order 910. It made text bigger and turned on Bold Text, and that was the entire
treatment. Meanwhile the Settings app's Accessibility page had exactly two
controls, so there was nothing else a lesson *could* have taught.

That lesson is now deleted. Everything it did, Unit 13 does across two lessons
with more room, and the unit goes on to cover eight more settings that did not
previously exist in the simulator.

## What was built first

Lessons can only teach controls that exist. Six were added to
`SimThemeContext` and the Settings app, and each one visibly changes the
simulated desktop — none is a switch that only remembers its own position.

| Setting | What it actually does |
|---|---|
| Invert Colors | `filter: invert(1) hue-rotate(180deg)` on the whole desktop. White pages go black; the wallpaper flips hue. |
| Increase Contrast | `filter: contrast(1.55)`. Gray helper text under each setting becomes legible. |
| Color Filters | Off / Grayscale / Warm. Grayscale is `grayscale(1)`; Warm is a sepia-and-hue shift. |
| Larger Pointer | Swaps in a fat white-and-black arrow, drawn inline as a data-URI SVG cursor. |
| Reduce Motion | Adds a `.reduce-motion` class that zeroes every animation and transition duration inside the desktop. Windows stop sliding. |
| Spoken Descriptions | Draws a black bar along the bottom of the desktop naming whatever the pointer is over. A real screen reader speaks; this one prints, so the learner can *see* what would be said. |

`themeFilter()` composes the filter chain in a deliberate order — color filter,
then contrast, then invert last — because that is the order a real display
applies them, and inverting a warm-filtered screen looks different from
warm-filtering an inverted one.

Brightness and Night Shift stay as overlays rather than joining the filter
chain, because that is how they were already built and they work.

## The lessons

Orders 1310–1361. The capstone moved from 1300 to 1500 so it stays last.

### Why These Settings Exist (1310)
One reading lesson. Its job is to defuse the fear that stops people trying any
of this: nothing here is permanent, and these settings are not only for people
with a diagnosis.

### Text You Can Read (1320–1322)
Text Size, Bold Text, screen brightness. Brightness lives under Display rather
than Accessibility, and the lesson says so, because a learner who goes looking
under Accessibility and does not find it will conclude it does not exist.

### Color and Contrast (1330–1333)
Invert, contrast, color filters, then a lesson that builds a *combination* of
three. The combination lesson exists because the individual ones each imply
"this is the answer," and none of them is.

`a11y-invert` carries a `warning` banner: the screen genuinely goes dark
mid-lesson, and without warning that reads as a fault.

### Pointer, Motion and Sound (1340–1343)
Larger Pointer, Reduce Motion, Spoken Descriptions, and then
`a11y-turning-it-back` — a lesson whose whole subject is undoing changes. It
turns Invert on, turns it off, sets Grayscale, sets it back to Off. It is the
answer to the most common reason people never touch these settings.

### Zooming In (1350–1351)
Browser zoom, and then the distinction that actually matters: Text Size changes
every app on the computer, browser zoom changes one website. Learners conflate
these constantly.

### Unit 13 Assessment (1360–1361)
`a11y-assessment` runs in assessment mode — objectives, no step highlighting,
and objectives phrased as outcomes ("The text is heavier") rather than clicks.
Its hint points at where to look without naming the control, per the authoring
rules.

`a11y-your-own-computer` is a reading lesson that sends the learner to their
real machine, naming the three things the section might be called (Accessibility,
Ease of Access, Universal Access) since it differs by system.

## Deliberate non-duplication

Unit 9 already covers Dark Mode, Night Shift, notifications and Do Not Disturb.
Unit 13 does not repeat them. Where a topic was close enough to overlap, the
lesson was replaced:

- A planned dark-mode lesson became `a11y-combining`.
- A planned Do Not Disturb lesson became `a11y-turning-it-back`.
- A planned keyboard-navigation lesson was dropped entirely — Unit 2's
  `keyboard-nav-game` and Unit 4's `tab-sequence` already teach it.

Brightness appears in both Unit 9 (as one step of a larger settings tour) and
Unit 13 (as its own lesson, framed around eye strain). That one is intentional
repetition rather than duplication, but it is worth a second look during the
catalog audit.

## Verified in the browser

- The Accessibility page renders all three cards: Text, Color and Contrast,
  Pointer and Motion.
- Invert Colors flips the entire desktop, wallpaper and dock included, and the
  switch that did it is still visible and still works.
- `a11y-invert` completes end to end: warning banner shows, both steps register,
  the completion banner appears and the sim stays interactive.

`npx tsc --noEmit`, `scripts/check-lessons.py` (168 lessons) and `npm run build`
all clean.
