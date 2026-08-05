/**
 * The phone course — the whole curriculum for the "On Your Phone" tab.
 *
 * ## Why this is a separate course and not the main one made responsive
 *
 * The main course teaches a *laptop*, and nearly every skill in it is a skill a
 * phone does not have. Right-click, double-click, hover, drag with a mouse, the
 * whole of Unit 2's physical keyboard, window management, the folder picker the
 * real-world missions hand a directory through — none of that exists on glass.
 * Shrinking those lessons to 390px would not make them phone lessons; it would
 * make them unusable lessons that also happen to be small. `SmallScreenGuard`
 * has always told phone visitors the truth about that.
 *
 * So this teaches the phone, on the phone, with the phone's own vocabulary: tap,
 * press and hold, swipe, drag, pinch, and a keyboard made of pictures of keys.
 * Every action below is one a finger can actually perform.
 *
 * ## Why the content lives in TypeScript, not `content/lessons/*.json`
 *
 * Two reasons, both practical. `scripts/check-lessons.py` globs that folder and
 * derives unit counts, module shapes and `order` ranges from it — dropping a
 * second curriculum in there would corrupt every one of those numbers and the
 * sales material that quotes them. And the phone page is a client component with
 * no server round-trip, so a module it can simply import beats a `fs` read it
 * would have to go and fetch.
 *
 * The action union is checked by the compiler, which is the thing the JSON
 * lessons need `check-lessons.py` to do for them at build time.
 */

/** Everything a finger can do in the simulated phone. */
export type PhoneAction =
  // ── The device itself ──────────────────────────────────────────────────────
  | "open-app" //           tap an app icon on the home screen  (target: app id)
  | "go-home" //            swipe up from the bar at the bottom
  | "back" //               tap an app's own back arrow
  | "open-quick-settings" // swipe down from the top of the screen
  | "close-quick-settings" // swipe up to put it away
  | "quick-toggle" //       tap a switch in Quick Settings      (target: toggle id)
  | "quick-slider" //       drag a Quick Settings slider        (target, min, max)
  // ── Gestures the home screen teaches ───────────────────────────────────────
  | "long-press-app" //     press and hold an app icon          (target: app id)
  | "app-menu" //           tap an item in that menu            (target: label)
  | "drag-app" //           drag an icon into the bottom row    (target: app id)
  | "done-arranging" //     tap Done to stop the icons wiggling
  // ── Lists ──────────────────────────────────────────────────────────────────
  | "scroll-to" //          swipe up a list until something shows (target: label)
  | "swipe-row" //          swipe a row sideways to reveal Delete (target: row)
  | "delete-row" //         tap the Delete that swipe revealed    (target: row)
  // ── The keyboard ───────────────────────────────────────────────────────────
  | "tap-editor" //         tap a text area to raise the keyboard
  | "type-text" //          tap out letters                       (value: contains)
  | "shift-key" //          tap the up-arrow for a capital
  | "numbers-key" //        tap 123 for numbers and symbols
  | "backspace-key" //      tap the rub-out key
  | "tap-suggestion" //     tap a suggested word above the keys   (value: the word)
  | "emoji-key" //          tap the smiley key
  | "pick-emoji" //         tap an emoji in the picker            (value: the emoji)
  // ── Messages ───────────────────────────────────────────────────────────────
  | "open-thread" //        tap a conversation                    (target: contact)
  | "send-message" //       tap the send arrow
  | "attach-photo" //       tap +, then pick a photo              (two taps)
  | "report-junk" //        tap Report Junk on a scam text
  // ── Camera and Photos ──────────────────────────────────────────────────────
  | "take-photo" //         tap the big round shutter
  | "open-photo" //         tap a photo in the grid               (target: title)
  | "pinch-photo" //        pinch to zoom                         (dir: in | out)
  | "delete-photo" //       tap the trash, then confirm           (target: title)
  | "share-photo" //        tap share, then a contact             (target: contact)
  // ── Settings ───────────────────────────────────────────────────────────────
  | "open-section" //       tap a row in Settings                 (target: section id)
  | "toggle" //             tap a switch                          (target: setting id)
  | "slider" //             drag a slider into a range            (target, min, max)
  | "join-wifi" //          tap a network in the list             (target: network)
  | "permission"; //        answer an app's permission question   (value: allow | deny)

export interface PhoneStep {
  /** The sentence in the banner. Also the objective label in an assessment. */
  say: string;
  action: PhoneAction;
  target?: string;
  value?: string;
  dir?: "in" | "out";
  min?: number;
  max?: number;
}

export interface PhoneLesson {
  /**
   * Stored in `lac-progress` alongside the laptop course's slugs, so "Reset all
   * progress" clears both and nothing needs its own storage key. Every one
   * starts `phone-` and none of them collides with a lesson in
   * `content/lessons/` — `phone-check` asserts both.
   */
  slug: string;
  title: string;
  /** Dr. Digital teaching the idea, before the activity starts. */
  intro: string;
  /** What the learner should end up having done. Shown when they finish. */
  goal: string;
  success: string;
  hint: string;
  /** Assessment lessons drop the yellow rings and let steps be done in any order. */
  mode?: "guided" | "assessment";
  steps: PhoneStep[];
}

export interface PhoneUnit {
  /** Distinct from the laptop course's unit names — both lists share the certificate page. */
  unit: string;
  blurb: string;
  lessons: PhoneLesson[];
}

export const PHONE_COURSE: PhoneUnit[] = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    unit: "Phone Unit 1: Meet Your Phone",
    blurb: "The home screen, opening and leaving an app, and the panel of switches that hides above the top of the screen.",
    lessons: [
      {
        slug: "phone-home-screen",
        title: "The home screen and your apps",
        intro:
          "The home screen is the page of little pictures you see when the phone wakes up. Each picture is an app — a separate program that does one job. The one shaped like a speech bubble sends text messages. The one shaped like a camera takes pictures.\n\nYou open an app by tapping its picture once. Just once, and lightly. Phones do not need a double tap the way a laptop does, and pressing harder does nothing at all.\n\nTo leave an app you do not close it — you go home, and it waits for you. On most phones you go home by putting your finger on the short bar at the very bottom of the screen and sliding it upward. Nothing is lost when you do that. The app is still there, exactly where you left it.\n\nThe mistake almost everybody makes at first is tapping again because nothing seemed to happen. Give it a moment. Apps take a second to open, and a second tap usually lands somewhere you did not mean.",
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
        slug: "phone-quick-settings",
        title: "The switches above the top of the screen",
        intro:
          "The thin strip along the very top of the screen shows the time, whether you have Wi-Fi, and how much battery is left. It is only a report. You cannot tap those little icons.\n\nThe switches for them are hidden just above the top edge. Put your finger at the very top of the screen and drag downward, and a panel called Quick Settings slides in with big buttons for Wi-Fi, Bluetooth, the flashlight, and a slider for screen brightness.\n\nThis is where you go when the screen is too dim to read, or when somebody says \"turn your Wi-Fi off and on again\" — which really does fix a surprising number of problems.\n\nTo put the panel away, slide it back up. If a panel ever covers your screen and you are not sure how it got there, sliding upward is almost always how you get rid of it.",
        goal: "You opened Quick Settings, switched Wi-Fi off and on, and put the panel away.",
        success: "Now you can find the brightness slider in the dark, which is exactly when you need it.",
        hint: "Start with your finger right at the very top edge of the screen, then drag straight down.",
        steps: [
          { say: "Drag down from the very top of the screen.", action: "open-quick-settings" },
          { say: "Tap the Wi-Fi button to switch it off.", action: "quick-toggle", target: "wifi" },
          { say: "Tap it once more to switch it back on.", action: "quick-toggle", target: "wifi" },
          { say: "Drag the brightness slider up past halfway.", action: "quick-slider", target: "brightness", min: 55, max: 100 },
          { say: "Slide the panel back up to close it.", action: "close-quick-settings" },
        ],
      },
      {
        slug: "phone-scrolling",
        title: "Getting further down a page",
        intro:
          "A phone screen shows about a postcard's worth of a page at a time. The rest of it is not missing — it is below the edge, waiting.\n\nTo bring it up, put your finger anywhere on the page and slide upward, as though you were pushing a sheet of paper up a desk. The page follows your finger. Slide down to go back the other way.\n\nThis is a slide, not a tap. Keep your finger on the glass while it moves. If you tap and lift instead, you will open whatever was under your finger, which is how people end up somewhere they did not intend.\n\nA good habit: if a list looks short, always try sliding up before deciding the thing you want is not there. On a phone almost every list is longer than it looks.",
        goal: "You scrolled a long list, opened something near the bottom of it, and came back.",
        success: "Sliding to see more is the single most-used gesture on a phone. You will do it hundreds of times a day now.",
        hint: "Rest your finger on the list, slide it upward without lifting, then let go.",
        steps: [
          { say: "Tap Settings to open it.", action: "open-app", target: "settings" },
          { say: "Slide the list upward until About this phone appears.", action: "scroll-to", target: "About this phone" },
          { say: "Tap About this phone.", action: "open-section", target: "about" },
          { say: "Tap the back arrow at the top left.", action: "back" },
          { say: "Go home.", action: "go-home" },
        ],
      },
      {
        slug: "phone-unit1-check",
        title: "Unit 1 check: find your way around",
        intro:
          "No yellow rings this time. Nothing here is new — you have done every one of these already, just with a hint pointing at it.\n\nThe list of what to do is at the top, and it does not matter which order you do them in. If you get properly stuck, the rings come back on their own after a while.\n\nTake as long as you like. Nothing on this phone can break, and there is nobody watching.",
        goal: "You found your way around the phone without being shown where to tap.",
        success: "That was the whole unit with the training wheels off. You can find an app, leave it, and reach the switches.",
        hint: "Quick Settings hides above the top edge of the screen. Home is the bar along the bottom.",
        mode: "assessment",
        steps: [
          { say: "Open the Notes app.", action: "open-app", target: "notes" },
          { say: "Get back to the home screen.", action: "go-home" },
          { say: "Open Quick Settings.", action: "open-quick-settings" },
          { say: "Switch the flashlight on.", action: "quick-toggle", target: "flashlight" },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    unit: "Phone Unit 2: Touch Gestures",
    blurb: "Press and hold, swipe a row sideways, drag an icon somewhere new, and pinch a photo bigger.",
    lessons: [
      {
        slug: "phone-long-press",
        title: "Press and hold",
        intro:
          "A tap says \"open this\". Holding your finger still on something for about a second says \"tell me more about this\" — and a little menu of extra choices appears.\n\nOn a laptop this is the right-click. On a phone there is no second button to click, so the phone reads how long you stay instead.\n\nThe part people get wrong is moving. If your finger slides even a little while you hold, the phone decides you meant to swipe and no menu appears. Put your finger down, keep it still, and count to one.\n\nPress and hold works nearly everywhere — on an app, on a photo, on a word in a message, on a link. When you are not sure what you can do with something, holding it is a safe way to find out. Nothing happens until you pick something off the menu, and tapping the empty space beside the menu makes it go away.",
        goal: "You held an app icon down, got its menu, and used a shortcut from it.",
        success: "Press and hold is the phone's hidden second layer. Now you know it is there, you will start finding it everywhere.",
        hint: "Put your finger on the Notes icon and leave it completely still — do not slide.",
        steps: [
          { say: "Press and hold the Notes app icon.", action: "long-press-app", target: "notes" },
          { say: "Tap New note in the menu.", action: "app-menu", target: "New note" },
          { say: "Go home.", action: "go-home" },
        ],
      },
      {
        slug: "phone-swipe-row",
        title: "Swiping a row sideways",
        intro:
          "In lists of things — messages, emails, reminders — you can slide a single row sideways instead of the whole page. Doing that uncovers buttons hidden underneath the row, usually a red Delete.\n\nIt is a small, deliberate movement: finger on the row, straight across to the left, then lift. Straight across matters. If your finger drifts up or down, the phone scrolls the list instead and the row snaps back.\n\nNothing is deleted by the swipe itself. It only uncovers the button — you still have to tap Delete. If you change your mind, swipe the row back the other way or tap anywhere else, and it closes up again.\n\nThis is how you clear out junk texts without opening them, which matters, because opening a junk text is how the sender learns your number is real.",
        goal: "You swiped a junk message out of the way and deleted it without ever opening it.",
        success: "Straight across, then tap Delete. That is the fastest cleanup on a phone.",
        hint: "Put your finger on the row and move it left in a straight line, without lifting.",
        steps: [
          { say: "Open Messages.", action: "open-app", target: "messages" },
          { say: "Swipe the row from Free Prize Draw to the left.", action: "swipe-row", target: "Free Prize Draw" },
          { say: "Tap the red Delete button.", action: "delete-row", target: "Free Prize Draw" },
          { say: "Go home.", action: "go-home" },
        ],
      },
      {
        slug: "phone-drag-app",
        title: "Moving an app where you want it",
        intro:
          "The apps you use most should be on the bottom row, because that is the part of the screen your thumb reaches without you shifting your grip on the phone. The apps you never use can be anywhere.\n\nMoving one starts with the press and hold you learned two lessons ago. Hold an icon, and in the menu that appears choose to move the apps around. The whole screen starts wobbling, which is the phone saying \"I am listening, drag things now\".\n\nThen, without lifting your finger, slide the icon where you want it and let go. While everything is wobbling no app will open if you tap it, which is deliberate — it stops you launching things by accident while you rearrange. Tap Done and the screen settles back down.\n\nIf you drop an icon somewhere wrong, pick it up and move it again. There is no way to lose an app by dragging it.",
        goal: "You moved an app down to the bottom row where your thumb can reach it.",
        success: "Your phone is yours to arrange. Put the apps you actually use where your thumb lands.",
        hint: "Hold the Camera icon, choose Move apps around, then slide it into the bottom row without lifting your finger.",
        steps: [
          { say: "Press and hold the Camera icon.", action: "long-press-app", target: "camera" },
          { say: "Tap Move apps around.", action: "app-menu", target: "Move apps around" },
          { say: "Drag Camera down into the bottom row.", action: "drag-app", target: "camera" },
          { say: "Tap Done.", action: "done-arranging" },
        ],
      },
      {
        slug: "phone-pinch",
        title: "Pinching to make things bigger",
        intro:
          "Put two fingers on the screen and spread them apart, and whatever is under them grows. Bring them back together and it shrinks again. That is pinching, and it works on photos, maps, and most web pages.\n\nIt is the single most useful thing on a phone for anybody whose eyes are not what they were. Text too small in an article? Spread two fingers. Cannot see a face in a photo? Spread two fingers.\n\nBoth fingers need to be touching the glass at the same time, and it is the distance between them that the phone reads — so start with them close together when you want to make something bigger, and far apart when you want to shrink it.\n\nNothing you pinch is changed. You are moving a magnifying glass over it, not editing it. Double-tapping usually snaps it back to normal size.",
        goal: "You zoomed into a photo with two fingers and back out again.",
        success: "That is your magnifying glass, and it is always in your pocket now.",
        hint: "Both fingers on the picture at once, then move them apart. On a computer, hold Ctrl and scroll instead.",
        steps: [
          { say: "Open Photos.", action: "open-app", target: "photos" },
          { say: "Tap the photo of the bird.", action: "open-photo", target: "Bird on a Branch" },
          { say: "Spread two fingers apart to zoom in.", action: "pinch-photo", dir: "out" },
          { say: "Pinch them back together to zoom out.", action: "pinch-photo", dir: "in" },
        ],
      },
      {
        slug: "phone-unit2-check",
        title: "Unit 2 check: gestures",
        intro:
          "Four gestures, no rings, any order. Everything here is something you did in this unit.\n\nOne of them is a swipe sideways, which is the one people most often turn into a scroll by accident. Straight across.",
        goal: "You performed each of the unit's gestures without being shown where.",
        success: "Tap, hold, swipe, pinch. That is the whole language of a touch screen, and you speak it now.",
        hint: "Junk messages are cleared by sliding the row sideways. Photos get bigger with two fingers.",
        mode: "assessment",
        steps: [
          { say: "Delete the junk message about a package delivery.", action: "swipe-row", target: "Delivery Notice" },
          { say: "Confirm the deletion.", action: "delete-row", target: "Delivery Notice" },
          { say: "Open a photo and zoom into it.", action: "pinch-photo", dir: "out" },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    unit: "Phone Unit 3: Typing on Glass",
    blurb: "The keyboard that appears out of nowhere: capitals, numbers, the rub-out key, suggested words, and emoji.",
    lessons: [
      {
        slug: "phone-keyboard-basics",
        title: "The keyboard that appears",
        intro:
          "A phone has no keyboard until it needs one. Tap anywhere you are meant to write and a keyboard slides up from the bottom, taking over the lower half of the screen. Tap somewhere else and it goes away again.\n\nThe keys are far too small for most fingers, and that is not your fault — nobody hits them all. The phone corrects a great deal of it quietly. Type at the speed that feels comfortable and let it.\n\nThe key marked with a left arrow, usually at the bottom right, is the rub-out key. Each tap removes one letter, the last one you typed. Hold it down and it keeps going.\n\nThe long bar across the bottom is the space bar, same as on a laptop. And the keyboard covering half your screen is normal — the writing you are doing sits in the half above it.",
        goal: "You typed a few words with the on-screen keyboard and rubbed one out.",
        success: "Slow and steady beats fast and wrong. Nobody types quickly on glass, including the people who made it.",
        hint: "Tap the empty note area first — the keyboard only appears once the phone knows where the letters are going.",
        steps: [
          { say: "Open Notes.", action: "open-app", target: "notes" },
          { say: "Tap the empty note to bring up the keyboard.", action: "tap-editor" },
          { say: "Tap out the word: hello", action: "type-text", value: "hello" },
          { say: "Tap the rub-out key once to remove the last letter.", action: "backspace-key" },
          { say: "Now type the rest so it reads: hello there", action: "type-text", value: "hello there" },
        ],
      },
      {
        slug: "phone-capitals-numbers",
        title: "Capitals, numbers and symbols",
        intro:
          "The keyboard only shows small letters, because that is what most writing is. The other characters are one tap away.\n\nThe up-arrow on the left is Shift. Tap it once and the next letter you type comes out as a capital, then it switches itself off again. That is what you want for the start of a name or a sentence.\n\nThe key marked 123 swaps the whole keyboard over to numbers and punctuation. The same key then reads ABC, and tapping it brings the letters back. Nothing is lost when you switch — whatever you have written stays where it was.\n\nPeople get stuck here looking for a key that is simply on the other layout. If you cannot find the comma, the pound sign or the question mark, it is behind 123.",
        goal: "You typed a capital letter and a number using the two keys that switch layouts.",
        success: "Shift for one capital, 123 for numbers. Those two keys are behind most of the \"I cannot find the key\" moments.",
        hint: "Shift is the up-arrow on the left of the bottom letter row. It switches itself off after one letter.",
        steps: [
          { say: "Open Notes.", action: "open-app", target: "notes" },
          { say: "Tap the note to bring the keyboard up.", action: "tap-editor" },
          { say: "Tap the up-arrow key for a capital.", action: "shift-key" },
          { say: "Type: Monday", action: "type-text", value: "Monday" },
          { say: "Tap the 123 key to see the numbers.", action: "numbers-key" },
          { say: "Type: 10", action: "type-text", value: "10" },
        ],
      },
      {
        slug: "phone-suggestions",
        title: "The words above the keyboard",
        intro:
          "As you type, a row of three words appears just above the keys. The phone is guessing what you are in the middle of writing.\n\nTapping one of them finishes the word for you. Type b-i-r-t-h and \"birthday\" is likely to be sitting there, ready. On a keyboard this small, tapping one word instead of five more letters is worth having.\n\nThey are only guesses. If none of the three is what you meant, ignore them and carry on typing — they will change with every letter you add.\n\nThe same machinery quietly fixes typing you did not ask it to fix, which is mostly welcome and occasionally not. If a word comes out wrong, the rub-out key takes it back a letter at a time.",
        goal: "You finished a word by tapping a suggestion instead of typing it out.",
        success: "Four letters instead of eight. On glass, that adds up fast.",
        hint: "Type the first few letters and watch the row of three words directly above the keys.",
        steps: [
          { say: "Open Notes.", action: "open-app", target: "notes" },
          { say: "Tap the note to bring the keyboard up.", action: "tap-editor" },
          { say: "Start typing: birth", action: "type-text", value: "birth" },
          { say: "Tap the suggested word birthday above the keys.", action: "tap-suggestion", value: "birthday" },
        ],
      },
      {
        slug: "phone-emoji",
        title: "Emoji",
        intro:
          "The little smiley key beside the space bar swaps the letters for a grid of small pictures — emoji. Tapping one drops it into what you are writing, exactly like a letter.\n\nThey are not decoration for its own sake. A short message can read as curt when it is only words, and one friendly face on the end changes the tone completely. Families use them constantly.\n\nThe grid is long. Slide it up and down to see more, and the row of tabs along the bottom jumps between faces, animals, food and the rest.\n\nTo get back to letters, tap the key marked ABC. Emoji can be rubbed out with the rub-out key just like any other character.",
        goal: "You put an emoji into a note and came back to the letters.",
        success: "One friendly face is often the difference between a message that sounds warm and one that sounds cross.",
        hint: "The smiley key sits just to the left of the long space bar.",
        steps: [
          { say: "Open Notes.", action: "open-app", target: "notes" },
          { say: "Tap the note to bring the keyboard up.", action: "tap-editor" },
          { say: "Tap the smiley key beside the space bar.", action: "emoji-key" },
          { say: "Tap the red heart.", action: "pick-emoji", value: "heart" },
        ],
      },
      {
        slug: "phone-unit3-check",
        title: "Unit 3 check: typing",
        intro:
          "Write a short note using the keys this unit covered. No rings, any order.\n\nThe word you need to write is **Friday**, with a capital F — so one of these needs the Shift key.",
        goal: "You wrote a note using capitals, numbers and an emoji.",
        success: "Capitals, numbers, emoji, suggestions. That is a whole phone keyboard.",
        hint: "The capital comes from the up-arrow key. Numbers are behind 123. Emoji are behind the smiley.",
        mode: "assessment",
        steps: [
          { say: "Write the word Friday with a capital F.", action: "type-text", value: "Friday" },
          { say: "Add a number to the note.", action: "numbers-key" },
          { say: "Put any emoji in the note.", action: "emoji-key" },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    unit: "Phone Unit 4: Texting and Photos",
    blurb: "Reading and answering a text, sending a picture, taking one, and what to do about the texts that are trying to rob you.",
    lessons: [
      {
        slug: "phone-read-reply",
        title: "Reading and answering a text",
        intro:
          "Messages is a list of conversations, one row for each person. The newest is at the top. A row in bold has something in it you have not read yet.\n\nTap a row and you see the whole conversation, oldest at the top, newest at the bottom. Their messages sit on the left, yours on the right in a different color. That layout is the same in nearly every messaging app.\n\nAt the bottom is a box to write in. Tap it, the keyboard comes up, type, then tap the arrow beside the box to send. The message appears in the conversation immediately.\n\nThere is no undo. Read it before you tap the arrow — that is the only safety net, and it is enough.",
        goal: "You opened a conversation, wrote a reply and sent it.",
        success: "That is a text message sent. The rest of texting is just more of that.",
        hint: "The box to write in is at the very bottom. The send arrow is to its right.",
        steps: [
          { say: "Open Messages.", action: "open-app", target: "messages" },
          { say: "Tap the conversation with Alex.", action: "open-thread", target: "Alex" },
          { say: "Tap the message box at the bottom.", action: "tap-editor" },
          { say: "Type: on my way", action: "type-text", value: "on my way" },
          { say: "Tap the send arrow.", action: "send-message" },
        ],
      },
      {
        slug: "phone-send-photo",
        title: "Sending a picture",
        intro:
          "Beside the message box is a plus sign. Tapping it offers you things to send that are not words — usually a picture first, because that is what people send.\n\nTap it and your recent photos appear. Tap the one you want and it goes into the message, waiting. Nothing has been sent yet: you still tap the send arrow, exactly as with words. You can add a line of text alongside it if you like.\n\nThis is worth practicing until it is easy, because it is the thing grandparents most want to do and most often ask for help with.\n\nOne caution that has nothing to do with the buttons. A picture sent is a picture given away — the other person has their own copy now and you cannot take it back. Send accordingly.",
        goal: "You attached a photo to a message and sent it.",
        success: "Plus for a picture, arrow to send. That is the sequence, and it barely changes between apps.",
        hint: "The plus sign is at the left end of the message box.",
        steps: [
          { say: "Open Messages.", action: "open-app", target: "messages" },
          { say: "Tap the conversation with Grandma.", action: "open-thread", target: "Grandma" },
          { say: "Tap the plus, then choose the photo of the dog.", action: "attach-photo", target: "Dog in the Field" },
          { say: "Tap the send arrow.", action: "send-message" },
        ],
      },
      {
        slug: "phone-camera",
        title: "Taking a photo",
        intro:
          "The Camera app shows you what the lens sees, live. Point the phone, and the big round button at the bottom takes the picture. One tap, one photo.\n\nThe picture is saved on its own the instant you tap. There is nothing to name, nowhere to file it, and no save button to find. It goes straight into Photos, at the end of the list, and it will still be there in ten years.\n\nThe small round arrow flips between the camera on the back and the one on the front. The front one is for photographs of yourself, and it shows you a live picture of your own face, which is startling the first time.\n\nHold the phone still for a moment after tapping. The commonest reason for a blurry photo is moving the phone while it is still working.",
        goal: "You took a photo and found it afterward in Photos.",
        success: "Tap the round button and it is saved forever, with nothing else to do. Cameras used to be much harder than this.",
        hint: "The shutter is the big circle at the bottom middle of the camera screen.",
        steps: [
          { say: "Open Camera.", action: "open-app", target: "camera" },
          { say: "Tap the big round button to take the photo.", action: "take-photo" },
          { say: "Go home.", action: "go-home" },
          { say: "Open Photos.", action: "open-app", target: "photos" },
          { say: "Tap the photo you just took.", action: "open-photo", target: "Just Taken" },
        ],
      },
      {
        slug: "phone-scam-text",
        title: "The text that is trying to rob you",
        intro:
          "Some of the texts you get are criminals. They come as a missed delivery, an unpaid toll, a bank warning, a prize. Every one of them contains a link and a reason to hurry.\n\nThe hurry is the tell. A real bank does not give you four hours. A real delivery company does not need your card details for a redelivery fee. If a message makes your stomach drop and points at a link, that reaction is the product they are selling.\n\nDo not tap the link. Not to see where it goes, not to check whether it is real — the tap is the thing that costs you. And do not reply, not even to say stop, because a reply proves a person reads this number and the number gets sold on.\n\nThere is a Report Junk button. Use that instead, and then delete it. If you genuinely worry the message might be real, close it and telephone the company on a number you already had.",
        goal: "You reported a scam text instead of tapping the link in it.",
        success: "You did the right thing: nothing tapped, nothing answered, reported and gone. That is the whole defense.",
        hint: "Report Junk sits underneath the message. The blue link in the middle is the one thing not to touch.",
        steps: [
          { say: "Open Messages.", action: "open-app", target: "messages" },
          { say: "Tap the message from the unknown number.", action: "open-thread", target: "Unknown" },
          { say: "Do not tap the link. Tap Report Junk.", action: "report-junk" },
        ],
      },
      {
        slug: "phone-unit4-check",
        title: "Unit 4 check: messages and pictures",
        intro:
          "No rings. Send one message and deal with one piece of junk.\n\nThe person to write to is **Alex**, and the message should say **running late**.",
        goal: "You sent a message and cleared a scam without opening its link.",
        success: "Sending, attaching, and refusing to tap. That is texting handled.",
        hint: "The send arrow sits to the right of the message box. Junk gets reported, not answered.",
        mode: "assessment",
        steps: [
          { say: "Write running late to Alex and send it.", action: "type-text", value: "running late" },
          { say: "Send the message.", action: "send-message" },
          { say: "Report the message from the unknown number as junk.", action: "report-junk" },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    unit: "Phone Unit 5: Settings and Staying Safe",
    blurb: "Make the screen readable, get onto Wi-Fi, and answer the questions apps ask about your private information.",
    lessons: [
      {
        slug: "phone-display",
        title: "Making the screen easier to read",
        intro:
          "If the writing on your phone is too small, that is a setting, not a fact. Nobody has to squint.\n\nSettings is the app shaped like a cog. Inside it, Display holds the two controls that matter most: brightness, and text size. Both are sliders — put your finger on the round handle and drag it along.\n\nText size is the one people do not know about. Drag it up and every app on the phone follows: messages, the web, everything. It costs you nothing except seeing slightly fewer words at a time.\n\nBrightness affects the battery. A dim screen lasts longer, a bright one is easier to read outdoors. Set it wherever you can read comfortably and stop thinking about it.",
        goal: "You made the screen brighter and the writing bigger.",
        success: "You never have to put up with text you cannot read. That slider is always there.",
        hint: "Put your finger on the round handle of the slider and drag it along the line.",
        steps: [
          { say: "Open Settings.", action: "open-app", target: "settings" },
          { say: "Tap Display.", action: "open-section", target: "display" },
          { say: "Drag the brightness slider above halfway.", action: "slider", target: "brightness", min: 55, max: 100 },
          { say: "Drag the text size slider up to make the writing bigger.", action: "slider", target: "text-size", min: 60, max: 100 },
        ],
      },
      {
        slug: "phone-wifi",
        title: "Getting onto Wi-Fi",
        intro:
          "Your phone has two ways onto the internet. Mobile data works anywhere and you pay for it by the month. Wi-Fi works in one building and is usually free.\n\nWhen you are at home, in a library or a cafe, being on Wi-Fi saves your data allowance and is often faster. Settings has a Wi-Fi row that lists every network within reach.\n\nA network with a padlock needs a password, which you type once and the phone remembers forever after. A network without one is open to everybody, including anybody else sitting in the cafe — fine for reading the news, not the place to do your banking.\n\nBe careful about the name. Criminals set up networks called things like \"Free Airport WiFi\" precisely because people join anything that sounds official. Ask the staff which one is theirs.",
        goal: "You joined a Wi-Fi network from the list of what was nearby.",
        success: "That network is remembered now. Your phone will rejoin it by itself every time you walk in.",
        hint: "Wi-Fi is a row in the main Settings list. Tap the network's name to join it.",
        steps: [
          { say: "Open Settings.", action: "open-app", target: "settings" },
          { say: "Tap Wi-Fi.", action: "open-section", target: "wifi" },
          { say: "Tap Library Guest to join it.", action: "join-wifi", target: "Library Guest" },
        ],
      },
      {
        slug: "phone-permissions",
        title: "When an app asks for something",
        intro:
          "Sooner or later a box appears saying an app would like your location, or your photos, or your contacts, with Allow and Don't Allow underneath. This is the phone asking your permission on your behalf, and it is one of the genuinely good things about a modern phone.\n\nThe question to ask is simple: does this app need this to do its job? A map needs your location. A notepad does not. A camera app needs the camera. A game asking for your contacts is not asking because it will help you.\n\nWhen in doubt, tap Don't Allow. If it turns out the app really did need it, it will ask again, and nothing was lost. Allowing something is much harder to walk back than refusing it.\n\nNone of these boxes ever needs a password. If a box that appears out of nowhere asks you to sign in, that is not the phone asking.",
        goal: "You refused an app something it had no business needing.",
        success: "Don't Allow is a complete answer and it costs nothing. An app that genuinely needs something will ask again.",
        hint: "Ask whether a notepad has any honest use for where you are standing.",
        steps: [
          { say: "Open Notes.", action: "open-app", target: "notes" },
          { say: "Notes is asking for your location. It does not need it — tap Don't Allow.", action: "permission", value: "deny" },
        ],
      },
      {
        slug: "phone-final-check",
        title: "Final check: the whole phone",
        intro:
          "The last one. Everything here came from one of the five units, and none of it is in order.\n\nTwo of these need Settings, which is the app shaped like a cog. One needs a gesture rather than a tap.\n\nWhen this is done, your certificate for the phone course is waiting under Certificates.",
        goal: "You did a job from every unit of the phone course, with no help.",
        success: "That is the phone course finished. Your certificate is on the Certificates tab whenever you want to print it.",
        hint: "Quick Settings comes down from the very top. The text size slider lives in Settings, under Display.",
        mode: "assessment",
        steps: [
          { say: "Open Quick Settings.", action: "open-quick-settings" },
          { say: "Open the Settings app and go to Display.", action: "open-section", target: "display" },
          { say: "Make the text bigger than halfway.", action: "slider", target: "text-size", min: 55, max: 100 },
          { say: "Join the Library Guest network.", action: "join-wifi", target: "Library Guest" },
        ],
      },
    ],
  },
];

/** Every phone lesson, flat, in course order. */
export const PHONE_LESSONS: PhoneLesson[] = PHONE_COURSE.flatMap((u) => u.lessons);

/** Unit name → its lesson slugs. Shared with the certificate page. */
export const PHONE_UNIT_SLUGS: Array<{ unit: string; slugs: string[] }> = PHONE_COURSE.map((u) => ({
  unit: u.unit,
  slugs: u.lessons.map((l) => l.slug),
}));

export function findPhoneLesson(slug: string): PhoneLesson | undefined {
  return PHONE_LESSONS.find((l) => l.slug === slug);
}

/** The unit a lesson belongs to, for the "next lesson" walk. */
export function phoneUnitOf(slug: string): PhoneUnit | undefined {
  return PHONE_COURSE.find((u) => u.lessons.some((l) => l.slug === slug));
}

/** The lesson after this one, across unit boundaries. `undefined` at the end. */
export function nextPhoneLesson(slug: string): PhoneLesson | undefined {
  const i = PHONE_LESSONS.findIndex((l) => l.slug === slug);
  return i === -1 ? undefined : PHONE_LESSONS[i + 1];
}
