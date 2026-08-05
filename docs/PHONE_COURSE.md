# The phone course

**Built 2026-08-04.** A second, separate course at `/phone` — the "On Your Phone"
tab, next to Certificates — for people whose only computer is the one in their
pocket. 23 lessons across 5 units, played on a simulated phone, with real touch
gestures.

---

## Why it is a separate course and not the main one made responsive

The obvious version of this request is "make the lessons fit a 390px screen".
That version does not work, and it took about ten minutes with the existing
curriculum to see why. The laptop course's 197 lessons are, overwhelmingly, about
things a phone does not have:

| The main course teaches | On a phone |
|---|---|
| Right-click (Unit 4 and every browser lesson) | there is no second button |
| Double-click (the first thing Unit 1 teaches) | one tap, and double-tap means zoom |
| The physical keyboard — 22 lessons of Unit 2 | there are no keys to hold down |
| Windows: move, resize, minimize, maximize | apps are full-screen, always |
| Hover, and everything that reveals | a finger has no hover state |
| Folder pickers in the real-world missions | `webkitdirectory` is desktop-only |

Shrinking those to phone width would not produce phone lessons. It would produce
unusable lessons that also happen to be small. `SmallScreenGuard` has always told
phone visitors the truth about this — and for most of its life it stopped there,
at "go and find a computer", which for a great many of the people this course
exists for is the end of the conversation.

So the phone gets taught on its own terms, with its own vocabulary: tap, press and
hold, swipe, drag, pinch, and a keyboard made of pictures of keys.

---

## Shape

```
lib/phoneCourse.ts            the whole curriculum + the typed action union
components/Phone/
  gestures.ts                 tap / long-press / swipe / drag / pinch / slider
  PhoneKeyboard.tsx           the on-screen keyboard, three layouts
  PhoneScreen.tsx             the simulated phone: 6 apps, Quick Settings, step engine
  PhoneCourse.tsx             course list → teaching card → activity → finish card
app/phone/page.tsx            the route
scripts/phone-check.mjs       plays all 23 lessons with real gestures  (npm run phone-check)
```

### Units

| Unit | Lessons | Teaches |
|---|---|---|
| 1. Meet Your Phone | 4 | home screen, opening/leaving an app, Quick Settings, scrolling |
| 2. Touch Gestures | 5 | press and hold, swipe a row, drag an icon, pinch to zoom |
| 3. Typing on Glass | 5 | the keyboard, Shift and 123, suggested words, emoji |
| 4. Texting and Photos | 5 | read/reply, send a picture, the camera, the scam text |
| 5. Settings and Staying Safe | 4 | brightness and text size, Wi-Fi, app permissions |

Each unit ends with an **assessment** — same `useStepRunner` mode the laptop
course uses, so the rings go off and objectives can be met in any order.

### What is shared with the laptop course, and what is not

**Shared:** `useStepRunner` (unchanged — guided mode, assessment mode, the 150ms
double-fire guard, the 20-second stuck-learner ring reveal), `Icons.tsx`,
`DrDigitalAvatar`, `lib/progress.ts`, the `animate-ring-pulse` cue, and the
contrast maths in `scripts/lib/sim-contrast.mjs`.

**Not shared:** `FakeDesktop`. A phone is not a small desktop — no windows, no
menu bar, no dock cascade, no second mouse button — and every one of that
component's affordances would be a lie here.

**No `sim-dark`.** That variant follows the Dark Mode switch inside the *laptop*
simulator's Settings app. The simulated phone has no such switch, so a
`sim-dark:` class here could never match; the first draft carried a few and they
were removed rather than left as decoration.

### Progress and certificates

Phone lessons are marked complete in `lac-progress` alongside the laptop
course's slugs — no second storage key, so "Reset all progress" clears both.
Every phone slug starts `phone-`, and `phone-check` asserts the two sets never
collide (they share one completed-slugs list; a collision would tick the wrong
lesson).

The certificate page offers phone unit certificates and a **separate**
whole-phone-course certificate. Deliberately not merged with the laptop one:
somebody who has finished the phone course has not been taught a laptop, and a
certificate implying otherwise would be a lie told to whoever they hand it to.

---

## The gesture engine, and the two mistakes it is built around

Everything in `gestures.ts` is Pointer Events. Touch events fire on a phone and
never on a laptop; mouse events fire on a laptop and only in a delayed,
lied-about form on a phone. Pointer events report both honestly, which matters
here more than anywhere else in the repo: **this course is meant to be played on
a phone, but it is authored, reviewed and script-checked on a computer.** A
gesture only one of those can perform is a gesture nobody can verify.

Two designs were tried and are wrong, and the file says so because both failures
are invisible until you hit them:

1. **Listening on the element alone.** The gesture dies the moment the finger
   leaves it — which, for the 22px-tall bar you swipe upward to go home, is
   immediately. Every swipe failed on its first frame.

2. **`setPointerCapture` on `pointerdown`.** Fixes that and breaks something
   worse. While a pointer is captured, the `click` that follows is dispatched to
   the *capturing* element instead of to whatever was under the finger. A
   swipeable row silently swallowed every tap on the button inside it: the entire
   Messages list opened nothing. The only screens that still worked were the ones
   where the swipe handler and the click handler happened to sit on the same
   element — which is exactly the pattern that makes a bug look like a
   coincidence rather than a rule.

The answer is a shared `usePointerTracking`: listen on the **window** for the
duration of the press, detach on `pointerup`, on `pointercancel` (how a browser
says "this is a scroll now, I am taking it") and on unmount. The gesture survives
leaving the element, and a plain tap is never intercepted.

### `touch-action` is not optional

A browser claims a gesture *before* it sends you the events for it. Left alone, a
vertical drag scrolls the page and a two-finger spread zooms the whole document,
and neither reaches this code. Each hook documents the value its element must
carry — `none` for the home bar and the photo, `pan-y` for a swipeable row so the
list underneath still scrolls. Getting this wrong does not throw. It produces a
gesture that works with a mouse and does nothing at all with a finger.

### `consumeClick`, twice

A browser does not decide a gesture was "a drag, not a tap" on your behalf. Both
of these were real, both were found by the harness, and both would have been
worse for a learner than for a script:

- **Long press then release still fires a `click`.** Holding an app icon opened
  its menu and then instantly opened the app on top of it. The menu appeared and
  vanished inside one gesture, which reads as "press and hold does nothing" — on
  the lesson whose entire subject is press and hold.
- **A swipe that starts and ends inside one element still fires a `click`.**
  Swiping a junk message sideways to uncover Delete *also opened it* — putting
  the learner inside the scam text they were trying to throw away without
  reading, in the unit that teaches not to open it.

Both hooks now expose `consumeClick()`. Call it first in the click handler and
bail out when it returns true.

### The pinch listener is a callback ref, not `useRef` + `useEffect`

The photo it attaches to only exists while a photo is open, so the node arrives
long after the hook first ran. An effect keyed on the handler re-attaches when
the *handler* changes — which in a guided lesson happens on every step, and hid
this completely. An **assessment has no current step**, so the handler identity
sat still, the effect never re-ran, and the wheel listener was never attached at
all. Pinching in the Unit 2 check did nothing, in the one place a learner has no
ring to fall back on.

A callback ref is invoked when the node mounts and again when it unmounts, which
is the question actually being asked.

---

## `npm run phone-check`

Plays all 23 lessons to the end at 390×844 with a touch context. Needs
`npm run dev` on :3000. **Green at 23/23.**

The gestures are performed, not faked. A swipe is a pointer pressed, moved across
several frames and released; a long press is a pointer held still for 750ms; a
pinch is Ctrl and the wheel, which is the same event a two-finger spread produces
and the only one a machine without a touchscreen can generate. Nothing goes near
`dispatchEvent` with a synthetic object.

It reads the curriculum from `window.__phoneCourse` rather than parsing the
TypeScript off disk, so the harness plays exactly the steps the page is running —
the same reasoning behind `stray-check`'s `window.__strayShow`. Development only.

Assessment lessons list outcomes, not routes ("write the word Friday" says nothing
about opening Notes first). A learner works that out; the harness is told, in
`ensureFor`.

### It also measures contrast

After every step, using `scripts/lib/sim-contrast.mjs` — the same maths
`sim-contrast-check` and `simdark-check` use, not a fourth copy of it. Measuring
on mount would measure the home screen; everything the course is about lives past
it.

Green at **1219 text runs and 13 control borders**, and it is demonstrably not
blind — on its first run it found three real defects, all now fixed:

- the celebration overlay's smaller line at **3.99:1** (translucent green-700
  over whatever the app was showing);
- "Tap anywhere else to close this" at **2.1:1**, white on the dimmed backdrop —
  the one line telling a stuck learner how to get out of a menu they did not mean
  to open;
- the keyboard's suggestion-strip placeholder at **3.9:1**.

### The negative control

`PHONE_NEGATIVE=1` replaces every gesture with a plain click on the same element.
That is not random sabotage — it is precisely the regression this course is most
likely to suffer, because "make it a button" is the reflex fix for a gesture
somebody finds fiddly, and a course that teaches swiping by asking you to click a
swipe-shaped button teaches nothing.

**Watched to fail: 11 findings, 12 of 23 lessons still finishing.** The twelve
that survive are the right twelve — the typing and messaging lessons genuinely are
all taps — and *that* is the reading to check on a future run. A negative control
that failed everything would mean the flag had broken the page rather than removed
the gestures, and would prove nothing.

---

## Two site-wide changes this needed

**`.h-screen` now resolves to `100dvh` where supported** (`globals.css`, in the
utilities layer, behind `@supports`). On a phone `100vh` is the height the
viewport *would* have with the address bar hidden, which it usually is not — so
the body ran taller than the visible area and the bar you swipe up to go home sat
underneath the browser chrome, unreachable. Layered as an override rather than
swapped at the call site, so a browser too old to know the unit keeps its
`100vh`. Identical on a desktop.

**The storage notice is tighter on small screens.** Full text kept — it is a
disclosure and shortening it would make it a less honest one — but at the desktop
size it took 430px off an 844px screen, which is half the simulated phone gone
until somebody finds the button.

---

## Still open

- **The simulated phone has no dark mode.** The laptop sim has one and Unit 9
  teaches it; the phone course teaches brightness and text size instead. If a
  phone dark mode is ever added it needs its own variant and its own sweep — do
  not reach for `sim-dark:`, which follows a switch in a different simulator.
- **No real-world missions.** The laptop course ends every unit with a task on
  the learner's own machine, checked in the browser. Most of those checks
  (`folder`, `window-max`, `zoom`) need APIs a phone browser does not have. The
  ones that could work on a phone — `dark-mode`, `reduce-motion`, `offline`,
  `type-answer`, `paste` — would make a genuine sixth unit.
- **Six apps, and every icon opens something.** Messages, Photos, Camera, Notes,
  Settings, Weather. Anything added to the home screen has to do something real;
  a beginner who taps an app that does nothing does not conclude "that app is
  empty", they conclude they tapped it wrong and try again harder. See
  `SAME_ICON_AUDIT.md`.
