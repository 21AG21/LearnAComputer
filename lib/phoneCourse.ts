/**
 * The phone course — the curriculum behind the "On Your Phone" tab.
 *
 * ## It is the same course, on the same computer
 *
 * The first version of this file was a second curriculum with its own hand-built
 * Messages, Photos, Camera and Settings. That was the wrong idea, and it was the
 * wrong idea for a reason this repo has a whole audit about
 * (`docs/SAME_ICON_AUDIT.md`): a copy of an app drifts from the app, and then the
 * same icon opens two different computers depending on which door you came in
 * through.
 *
 * So almost all of this is a **playlist**, not a curriculum. Each entry names a
 * lesson that already exists in `content/lessons/` and it plays on the phone
 * exactly as written — the same steps, the same assessments, the same hints, the
 * same Alex and Grandma and the same photo library — rendered by the same
 * components in a narrow frame. Anything fixed here would have been fixed in one
 * place anyway. Nothing has to be kept in step by hand.
 *
 * ## What is genuinely phone-only, and what is genuinely laptop-only
 *
 * Unit 1 below is written from scratch, because a phone has gestures a laptop
 * does not: tapping instead of clicking, sliding a page instead of turning a
 * wheel, and going home by pushing the screen upward. Those four lessons are the
 * only bespoke content in the whole course.
 *
 * Left out, deliberately, because a phone cannot do them: the trackpad and
 * mouse lessons, the whole physical-keyboard unit, window management, and the
 * real-world missions whose checks need a desktop-only browser API (handing over
 * a folder, or measuring a resized window). Leaving those out is honest. Faking
 * them would not be.
 *
 * ## Two held back, and why they are named here rather than quietly missing
 *
 * `shopping-spot-fake` and `final-files` are laptop lessons that `phone-check`
 * cannot yet play to the end at 390px — the first lays three comparison cards
 * out for a wide screen, the second is a six-objective file assessment whose
 * rename step the solver never lands. Both are *listed here* rather than simply
 * absent so the gap is a line of code somebody trips over, not an absence nobody
 * notices. A lesson a learner cannot finish is worse than a lesson they were
 * never offered; when they play, put them back.
 */

/** The gestures Unit 1 teaches. Everything else in the course is a real lesson. */
export type PhoneAction =
  | "open-app" //     tap an app icon on the home screen  (target: dock app id)
  | "go-home" //      slide the bar at the bottom upward
  | "scroll-to" //    slide a list until something shows  (target: visible text)
  | "open-panel" //   tap the Wi-Fi / battery / clock in the status strip
  | "close-panel"; // put that panel away

export interface PhoneStep {
  /** The sentence in the banner. Also the objective label in an assessment. */
  say: string;
  action: PhoneAction;
  target?: string;
}

/** A lesson written for the phone, because the laptop has no equivalent gesture. */
export interface PhoneGestureLesson {
  kind: "gesture";
  slug: string;
  title: string;
  intro: string;
  /** Past tense; the finish card's sentence. */
  goal: string;
  /**
   * Present tense; the banner while the learner is working.
   *
   * Assessments have no current step, so the banner used to fall back to `goal`
   * — and `goal` is written for the card that appears *after* it is done. A
   * frightened beginner opened the Unit 1 check and read "You found your way
   * around the phone", about something they had not done yet, above a screen
   * with no rings on it. Guided lessons never see this: they have a step.
   */
  doing?: string;
  success: string;
  hint: string;
  mode?: "guided" | "assessment";
  steps: PhoneStep[];
}

/** A lesson from `content/lessons/`, played on the phone exactly as written. */
export interface PhoneCourseLesson {
  kind: "lesson";
  /** Must exist in `content/lessons/`; `phone-check` fails the build otherwise. */
  slug: string;
}

export type PhoneEntry = PhoneGestureLesson | PhoneCourseLesson;

export interface PhoneUnit {
  unit: string;
  lessons: PhoneEntry[];
}

const ref = (...slugs: string[]): PhoneCourseLesson[] => slugs.map((slug) => ({ kind: "lesson", slug }));

export const PHONE_COURSE: PhoneUnit[] = [
  {
    unit: "Phone Unit 1: Meet Your Phone",
    lessons: [
      {
        kind: "gesture",
        slug: "phone-tap-and-home",
        title: "Tapping, and getting back home",
        intro:
          "The home screen is the page of little pictures you see when the phone wakes up. Each picture is an app — a separate program that does one job. The one shaped like a speech bubble sends messages. The one shaped like a cog changes your settings.\n\nYou open an app by tapping its picture once. Just once, and lightly. A phone does not need the double tap a laptop does, and pressing harder does nothing at all.\n\nTo leave an app you do not close it — you go home, and it waits for you. Put your finger on the short bar at the very bottom and slide it upward. Nothing is lost when you do that: a half-written message is still there when you come back.\n\nThe mistake almost everybody makes at first is tapping again because nothing seemed to happen. Give it a moment. Apps take a second to open, and a second tap usually lands somewhere you did not mean.",
        goal: "You opened two apps and came back to the home screen from both.",
        success: "That is the whole loop — tap to go in, slide up to come out. Everything else on a phone hangs off those two moves.",
        hint: "To go home, put your finger on the small bar along the very bottom and slide it up the screen.",
        steps: [
          { say: "Tap Messages to open it.", action: "open-app", target: "messages" },
          { say: "Slide the bar at the bottom upward to go home.", action: "go-home" },
          { say: "Now tap Photos.", action: "open-app", target: "photos" },
          { say: "Go home again the same way.", action: "go-home" },
        ],
      },
      {
        kind: "gesture",
        slug: "phone-sliding",
        title: "Sliding to see more",
        intro:
          "A phone screen shows about a postcard's worth of a page at a time. The rest of it is not missing — it is below the edge, waiting.\n\nTo bring it up, put your finger anywhere on the page and slide upward, as though you were pushing a sheet of paper up a desk. The page follows your finger. Slide down to go back the other way.\n\nThis is a slide, not a tap. Keep your finger on the glass while it moves. If you tap and lift instead, you will open whatever was under your finger, which is how people end up somewhere they did not intend.\n\nA good habit: if a list looks short, always try sliding up before deciding the thing you want is not there. On a phone almost every list is longer than it looks.",
        goal: "You slid a long list to reach something below the edge of the screen.",
        success: "Sliding to see more is the single most-used gesture on a phone. You will do it hundreds of times a day now.",
        hint: "Rest your finger on the list, slide it upward without lifting, then let go.",
        steps: [
          { say: "Tap Settings to open it.", action: "open-app", target: "settings" },
          { say: "Slide the list upward until you can see About.", action: "scroll-to", target: "About" },
          { say: "Go home.", action: "go-home" },
        ],
      },
      {
        kind: "gesture",
        slug: "phone-status-strip",
        title: "The strip along the top",
        intro:
          "The thin strip at the very top of the screen shows the time, whether you have Wi-Fi, and how much battery is left. It is there on every screen, in every app, and it never goes away.\n\nEach of those three is a button. Tap the Wi-Fi symbol and you get the list of networks in range. Tap the battery and it tells you how much is left in plain words. Tap the time and you get today's date and what is on.\n\nThis is where you go first when something seems wrong. \"The internet is not working\" is very often \"the Wi-Fi symbol is not there\", and you can see that in one glance without opening anything.\n\nTapping the same button again puts the panel away, and so does tapping anywhere else on the screen.",
        goal: "You opened a panel from the top strip and put it away again.",
        success: "Three buttons, always in the same corner, in every app. That strip answers most of the questions a phone raises.",
        hint: "The time is at the top left; the Wi-Fi symbol and the battery are at the top right. Tap one of them.",
        steps: [
          { say: "Tap the Wi-Fi symbol at the top of the screen.", action: "open-panel", target: "wifi" },
          { say: "Close the panel.", action: "close-panel" },
          { say: "Now tap the battery.", action: "open-panel", target: "battery" },
          { say: "Close that one too.", action: "close-panel" },
        ],
      },
      {
        kind: "gesture",
        slug: "phone-unit1-check",
        title: "Unit 1 check: find your way around",
        intro:
          "No yellow rings this time. Nothing here is new — you have done every one of these already, just with a hint pointing at it.\n\nTap \"What to do\" in the dark bar to see the list, and it does not matter which order you do them in. If you get properly stuck, the rings come back on their own after a while.\n\nTake as long as you like. Nothing on this phone can break, and there is nobody watching.",
        goal: "You found your way around the phone without being shown where to tap.",
        // The banner in an assessment falls back to `goal`, which is written for
        // the finish card — so a learner who had done nothing yet was reading a
        // claim about something they had not done. Present tense, and it points
        // at the only guidance an assessment has.
        doing: "Your turn, with no rings. Tap \"What to do\" in this bar to see the list.",
        success: "That was the whole unit with the training wheels off. From here on, the lessons are the same ones the laptop course uses — on your phone.",
        hint: "Home is the bar along the very bottom. The clock is at the top left.",
        mode: "assessment",
        steps: [
          { say: "Open the Notes app.", action: "open-app", target: "notes" },
          { say: "Get back to the home screen.", action: "go-home" },
          // Worded away from the Calendar app on purpose. "Find out today's date"
          // has an obvious wrong answer sitting on the home screen — the Calendar
          // icon — which opens, fills the screen, and leaves the score at 0 with
          // nothing said. The control that counts is the clock in the status
          // strip, and the objective now names the strip rather than the fact.
          { say: "Check the time and date without opening an app.", action: "open-panel", target: "calendar" },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Everything below is the laptop course, unchanged, played on the phone.
  // ───────────────────────────────────────────────────────────────────────────
  {
    unit: "Phone Unit 2: Files and Folders",
    lessons: ref(
      "file-what-is", "file-what-is-folder", "finder-overview", "saving-files",
      "file-naming", "creating-folders", "moving-files", "searching-files",
      "trash-delete", "unit-3-assessment",
    ),
  },
  {
    unit: "Phone Unit 3: The Internet and Browsing",
    lessons: ref(
      "internet-vs-website", "browser-vs-search", "urls", "domain-names",
      "safari-tabs", "safari-downloads", "safari-bookmarks", "reading-list",
      "history-autofill", "refresh-reload", "zooming-webpages", "https-secure",
      "cookies", "popups-ads", "popup-accident", "unit-4-assessment",
    ),
  },
  {
    unit: "Phone Unit 4: Messages and Video Calls",
    lessons: ref(
      "messages-contacts", "messages-app", "group-conversations", "messages-photos",
      "emoji-reactions", "facetime-basics", "facetime-features", "unit-5-assessment",
    ),
  },
  {
    unit: "Phone Unit 5: Email",
    lessons: ref(
      "email-basics", "inbox-organization", "composing-email", "reply-forward",
      "cc-bcc", "attachments", "managing-email", "spam-phishing", "unit-6-assessment",
    ),
  },
  {
    unit: "Phone Unit 6: Photos",
    lessons: ref(
      "photos-app", "photo-favorites", "photo-albums", "photo-people",
      "recently-deleted", "photo-editing", "sharing-photos", "unit-7-assessment",
    ),
  },
  {
    unit: "Phone Unit 7: Apps",
    lessons: ref(
      "app-store", "installing-apps", "app-permissions", "updating-apps",
      "deleting-apps", "free-vs-paid", "unit-8-assessment",
    ),
  },
  {
    unit: "Phone Unit 8: Settings",
    lessons: ref(
      "system-settings", "display-theme", "bluetooth-devices",
      "notifications-sound", "storage-battery", "unit-9-assessment",
    ),
  },
  {
    unit: "Phone Unit 9: Online Safety",
    lessons: ref(
      "passwords-basics", "password-managers", "two-factor", "passkeys",
      "scams-phishing", "identity-theft", "safe-shopping", "public-wifi",
      "software-updates", "backups", "unit-10-assessment",
    ),
  },
  {
    unit: "Phone Unit 10: When Something Goes Wrong",
    lessons: ref(
      "troubleshooting-basics", "software-problems", "internet-problems",
      "performance-storage", "password-recovery", "when-to-get-help", "unit-11-assessment",
    ),
  },
  {
    unit: "Phone Unit 11: Everyday Life",
    lessons: ref(
      "maps-practice", "qr-practice", "notes-save-practice",
      "cloud-vs-computer", "pdf-practice", "calendar-reminders", "unit-12-assessment-sim",
    ),
  },
  {
    unit: "Phone Unit 12: Making It Easier to Read",
    lessons: ref(
      "a11y-text-size", "a11y-bold-text", "a11y-brightness", "a11y-invert",
      "a11y-contrast", "a11y-colour-filters", "a11y-combining", "a11y-reduce-motion",
      "a11y-spoken-descriptions", "a11y-turning-it-back", "a11y-zoom-web-page",
      "a11y-zoom-vs-text-size", "a11y-assessment",
    ),
  },
  {
    unit: "Phone Final Assessment",
    lessons: ref(
      "final-browser", "final-calendar", "final-apps",
      "final-photos", "final-email", "final-messaging", "final-security",
      "final-troubleshooting", "final-settings", "final-accessibility",
    ),
  },
];

/** Every entry, flat, in course order. */
export const PHONE_ENTRIES: PhoneEntry[] = PHONE_COURSE.flatMap((u) => u.lessons);

/** The slugs of lessons this course borrows from `content/lessons/`. */
export const PHONE_LESSON_SLUGS: string[] = PHONE_ENTRIES.filter(
  (e): e is PhoneCourseLesson => e.kind === "lesson",
).map((e) => e.slug);

export function nextPhoneEntry(slug: string): PhoneEntry | undefined {
  const i = PHONE_ENTRIES.findIndex((l) => l.slug === slug);
  return i === -1 ? undefined : PHONE_ENTRIES[i + 1];
}
