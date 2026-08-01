# Final Assessment

Fourteen lessons at orders 1510–1570, replacing the one-lesson capstone that used
to sit at the end of the course.

## What it replaces

`capstone-pixel-vacation.json` was the entire graduation:

```json
{ "title": "Dr. Digital's Vacation (Capstone)",
  "drDigitalIntro": "…You'll connect to WiFi, browse, sign in, download files, send email, and more.",
  "playgroundTask": { "type": "none" } }
```

It listed the skills the learner was about to demonstrate and then did not ask
them to demonstrate any of them. `type: "none"` means there is no activity at
all. A capstone that is a paragraph is not a capstone.

Deleted. In its place, twelve activities and two reading lessons.

## The shape

Every lesson is one leg of the same trip — Dr. Digital goes away for a fortnight
and the learner handles the arrangements. That framing exists so the assessment
reads as one task rather than thirteen unrelated drills, and so each leg has a
reason to use the app it uses.

| Module | Lesson | Sim | Objectives |
|---|---|---|---|
| Before You Go | Dr. Digital goes on holiday | — | reading |
| Before You Go | Clear the desk | `guided-desktop` | 6 |
| Planning the Trip | Look up the details | `guided-browser` | 6 |
| Planning the Trip | Put it in the diary | `guided-calendar` | 7 |
| Packing and Paperwork | Sort out the paperwork | `guided-files` | 6 |
| Packing and Paperwork | Get the right app for the trip | `guided-app-store` | 6 |
| Packing and Paperwork | Pick the photos to take | `guided-photos` | 6 |
| Telling People | Write to the neighbor | `guided-email` | 7 |
| Telling People | Tell the family | `guided-messaging` | 7 |
| While You Are Away | Two messages arrive at the hotel | `guided-security` | 4 |
| While You Are Away | The hotel WiFi | `guided-troubleshooting` | 5 |
| While You Are Away | Set the laptop up for the evening | `guided-settings` | 4 |
| While You Are Away | Make it readable on the plane | `guided-settings` | 4 |
| Getting Home | Write it up | `notes-shortcut` | 6 |
| Graduation | You are finished | — | reading |

**74 objectives across twelve activities**, covering every unit in the course:
window management, browsing, calendars, files, apps, photos, email, messaging,
security, troubleshooting, settings, accessibility and keyboard shortcuts.

## Authoring rules followed

Every activity runs in `mode: "assessment"`, which means `useStepRunner` scans
all unmet objectives instead of only the current one, `SimulatorFrame` swaps the
step counter for a checklist, and every yellow highlight goes dark on its own.

The three rules for writing assessment objectives were applied throughout:

**State outcomes, never clicks.** Not "Click the New Folder button" but *"There
is a folder called Travel."* Not "Drag the window" but *"A window is somewhere
other than where it started."* The learner has to work out which control
produces the stated result.

**Use targets the unit's lessons did not use.** Unit 3 moves `Budget.xlsx`; the
final assessment moves `TaxReturn.pdf`. Unit 7 favorites the bird; this
favorites the koi. Unit 6 archives the Amazon email; this archives the meeting
email. Muscle memory from the teaching lessons does not carry the learner
through.

**Hints point at where to look and never name the control.** *"The toolbar along
the top of the Files window has everything you need. Deleted things are not gone
— check the last item in the list on the left."* That is a nudge. "Click Move to
Trash" would be the answer.

## Two things carried over deliberately

`final-email` and `final-security` both include a fake message the learner must
identify without being told which one it is. The lesson intro says only that one
of them is a scam. The security sim's wrong-verdict feedback is left in place, so
a wrong answer explains itself and the item stays open for a retry — failure is
part of that lesson, not a dead end.

`final-notes` carries a `warning` banner because the activity is keyboard-only
and the toolbar buttons deliberately do not count. Without the banner a learner
clicking Bold and seeing nothing happen would conclude the page is broken.

## Verified in the browser

- *Sort out the paperwork* opens Files with the full toolbar under a single
  title bar, shows **OBJECTIVES: 0 OF 6 DONE**, a Hint button and an expandable
  checklist, and highlights nothing.
- Creating a folder named Travel moved the counter to **1 OF 6**.

`scripts/check-lessons.py` reports 188 lessons; `npx tsc --noEmit`,
`npm run lint` (0 errors) and `npm run build` are clean.
