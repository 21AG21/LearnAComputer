# Demo runbook — Priya Elder Care

**Meeting: two days out. Owner: Arjun.**

This is the account-specific sheet. The general material lives in
`docs/SALES_PLAYBOOK.md` (cold call, objections, pricing posture) and
`docs/IMPLEMENTATION_GUIDE.md` (what happens after yes). Read this one on the
morning of; it assumes you already know those.

---

## 0. What we do not know yet — fill this in before you build the deck

Nothing below this line invents a fact about Priya Elder Care. **Do not walk in
having guessed.** Fifteen minutes of research changes the whole demo, because
which of the three framings in §2 you lead with depends entirely on it.

| Question | Why it changes the demo | Answer |
|---|---|---|
| Residential facility, adult day programme, or in-home care agency? | Residential → group sessions on a shared machine, lead with the activities calendar. In-home → one caregiver, one client, lead with the family-contact story. | |
| Roughly how many clients, and how many staff? | Decides pilot size and whether you offer to run session one yourself. | |
| Who is in the room, and what do they own? | Activities Director buys engagement. Executive Director buys differentiation and liability. Owner buys margin. | |
| Do clients have their own devices, or facility machines? | Decides whether "works on locked-down machines" is a headline or a footnote. | |
| Have they had a scam incident? | If yes, Unit 10 is the entire demo. Do not ask this coldly in the room — find out beforehand if you can. | |
| What did they say on the cold call that got this meeting? | Lead the demo with their sentence, not yours. | |

**On statistics:** elder financial fraud numbers are persuasive and they are
also the fastest way to get caught out. Do not quote a figure you have not
personally sourced that week. The safer, stronger line is to ask: *"What does a
scam incident cost you when it happens — not just the money, the family
conversation afterwards?"* Their number beats yours, and now they said it.

---

## 1. Two-day prep timeline

**Today**
- Fill in §0. Confirm attendees, format (in person / video), and who drives.
- Read §4 aloud once, timed. If it runs past 15 minutes, cut Unit 7, not Unit 10.
- Confirm the production URL is live and the deploy is current.

**Tomorrow (dress rehearsal — this is not optional)**
- Fresh browser profile, no saved progress. Drive the entire §4 path end to
  end, out loud, at demo pace.
- Deliberately make the two mistakes in §4 (wrong dock icon; wrong phishing
  verdict) and confirm both recover gracefully.
- Have a colleague, or anyone, watch it. The failure mode is you narrating what
  the screen already says.
- Anything that looks even slightly wrong: file it and fix it today, or cut
  that beat from the path. Never demo something you are hoping about.

**Morning of**
- Run `npm run demo-check`. It opens every stop in §4, plus both mission
  downloads, and fails if any one of them is not safe to show. Ninety seconds.
  **If it is not green, do not demo that path.** (If *everything* fails with
  500s, the dev server is serving a wiped `.next` — restart `npm run dev`.)
- Re-drive the first two minutes by hand (catches a bad deploy in 90 seconds).
- Charge the laptop. Bring the charger. Tether as backup — assume the venue
  Wi-Fi fails, because the demo is a website.
- Reset progress: `/dashboard` → Reset all progress. A demo that opens on
  someone else's half-finished course looks careless.
- Close every other tab. Notifications off. One window, full screen.

---

## 2. The frame — pick one, open with it

Do not open with features. Open with the sentence that matches what §0 told you.

**A. Residential / adult day — "the activity that isn't bingo."**
> "Your activities calendar has to fill every weekday, and most of it is
> passive. This is an hour a week where residents are *doing* something, they
> can see themselves getting better at it, and at the end they hold a
> certificate with their name on it."

**B. In-home care — "the thing families actually ask for."**
> "Families ask for two things: is my mother safe, and can I see her more. This
> teaches video calling and photo sharing in Unit 5, and it teaches scam
> recognition in Unit 10. Same course."

**C. Any of them, if §0 turned up a scam incident — "the unit that pays for it."**
> "You already know what one of these costs. Unit 10 is a scam inbox a resident
> can practice in — where clicking the wrong link costs them nothing, and
> teaches them the thing that saves them later."

Whichever you pick, land this before you touch the keyboard:

> "Everything you're about to see, the learner does themselves. I'm going to
> make beginner mistakes on purpose, because that's where every other course
> loses people."

---

## 3. The one number that matters, and how to say it

> "Every single activity in this course has been machine-proven finishable — a
> harness plays all 132 of them to the end, the way a learner would, and it runs
> again every time we change anything. Ten separate bugs that would have
> stranded a real learner mid-lesson were caught that way."

This is the strongest credibility line we own, and it is literally true
(`npm run solve-check`, `docs/GOAL_STATE.md`). Say it once, early, then prove it
by demoing without a net. Do not repeat it — it lands once.

---

## 4. The demo path — exact, verified, ~14 minutes

Drive it in this order. URLs are real; every one of these was played end to end
by the harness. **Never improvise a detour into a lesson you did not rehearse.**

### Beat 1 — the first minute of a beginner's life (2 min)
`/lessons/using-the-trackpad-or-mouse`

Falling shapes, clicking practice. **Miss several on purpose.**

> "This is lesson one. Not a video about a mouse — a mouse. And watch: I keep
> missing, and it slows down for me. No timer, no score to lose, no way to fail.
> This is someone who has never held one of these."

### Beat 2 — the desktop, with two windows (2 min)
`/playground`

Open **Mail** from the dock. Then open **Browser**. Drag one aside so both are
visible. Click the buried one to bring it forward. Minimize one; bring it back
from the dock.

> "Every lesson happens on this practice computer. Two windows, because that's
> the thing that confuses people most — 'where did it go?' They can make that
> mistake here fifty times and nothing breaks."

*(Why this is in the demo: this was broken until this week — a second app
closed the first. It is now covered by `scripts/desktop-check.mjs`.)*

### Beat 3 — a guided lesson, and a deliberate mistake (3 min)
`/lessons/video-calling` (framing B) or `/lessons/working-with-files` (framing A)

Let the glow lead you. Then **click the wrong dock icon on purpose.**

> "Watch what happens when I get it wrong. No red error, no 'incorrect', no
> dead end — it just waits and keeps pointing. Nobody is ever stuck and nobody
> is ever told off."

Then finish the step and let the completion moment play.

### Beat 4 — the unit that funds the programme (3 min)
`/lessons/recognizing-threats`

Open the inbox. Inspect a link — show the real address appearing. Mark the scam
**Dangerous**. Then, on the next one, **mark a safe message Dangerous on
purpose**: show the correction, and that the item stays live to retry.

> "Getting it wrong here is free. That's the entire point — the only safe place
> to be fooled by one of these is in here."

### Beat 5 — the part nobody else has (2 min)
`/lessons/unit-3-assessment` → the real-world mission

Download the practice folder, then let the page check the learner's own folder
on the real machine.

> "This isn't a simulation any more. They just did it on their own computer, and
> the page checked their real work. And nothing was uploaded — there's no server
> to upload to. It reads the folder in the browser and forgets it."

**Let this land. Do not talk over it.** This is where sceptics turn.

### Beat 6 — the certificate (1 min)
`/certificate`

Type a resident's name. Print preview.

> "This goes on a wall, or in a family newsletter. For a lot of your residents
> it's the first certificate they've earned in forty years."

### Beat 7 — the close (1 min)

> "Every unit works the way you just saw. What would need to be true for you to
> put six residents through Unit 1 next month?"

Then stop talking. Let them answer.

---

## 5. Objections you will hear from *this* buyer

The general table is in `docs/SALES_PLAYBOOK.md §5`. These are the elder-care
ones it does not cover.

| What they say | What to say |
|---|---|
| "Our residents have tremors / arthritis." | "Targets are large, nothing is timed, and nothing has to be done quickly. The clicking game literally slows down when someone is struggling. And Unit 13 teaches them to make the pointer bigger and slower themselves — on their own machine, permanently." |
| "Many have low vision." | "Unit 13 is entirely about that: bigger text, heavier text, higher contrast, a warmer screen, zooming in. And the contrast on the pages they read has been measured against the accessibility standard and fixed. A full third-party audit is on the roadmap and I won't claim it's done." |
| "Some have memory loss / early dementia." | Be honest: "This is built for someone who is learning slowly, not for someone who cannot retain. There's no time pressure, progress is saved, and a lesson can be repeated forever. But I'd want to be careful about promising it for advanced cognitive decline — I'd rather you pilot it with the group you think is right and tell me." |
| "Staff don't have time to teach computers." | "That's the design. The instructor doesn't teach — the course teaches, and a staff member sits nearby for reassurance. `docs/IMPLEMENTATION_GUIDE.md` has the session sheets; the staff role is about twenty minutes of setup, once." |
| "What if a resident actually gets scammed using this?" | "Nothing inside the course can reach the real world. The email, the browser, the shop, the bank — all simulated, no message can be sent, no purchase can be made. The only real thing is the practice folder they download, and that stays on their machine." |
| "Is any of this HIPAA-relevant?" | "We never ask for, store, or transmit anything about health, care, or a client's identity. The whole data model is an email address and a list of finished lesson names — and it works with no account at all. Nothing about it touches a care record." |
| "Families will ask what we're doing with this." | "Give them the certificate and the unit list. And point them at the privacy page — it's in plain language and it's honest, including that we count page views." |
| "Can we see who's progressing?" | **Do not overclaim.** "Not yet as a dashboard — that's designed and next on the roadmap. Today a pilot runs on a check-in sheet, and pilots shape what that dashboard becomes. I'd rather tell you that than show you a screen that doesn't exist." |

---

## 6. Leave-behind

One page, printed, handed over — not emailed afterwards:

1. What it is, one paragraph.
2. The 14 units as a list. (`/lessons` — screenshot it.)
3. The three honest claims: hands-on not video · nothing uploaded · every
   activity proven finishable.
4. The pilot offer: six residents, Unit 1, one hour a week, four weeks, free.
5. Your name, your number, the URL.

Do not leave pricing. Do not leave a roadmap. A roadmap in a buyer's hands
becomes a promise.

---

## 7. After the meeting — same day

- Send one email: thank you, the URL, and **the single thing they reacted to
  most**. Not a summary of everything.
- Any question you could not answer: answer it within 24 hours, even if the
  answer is "no, and here's when." This is the whole reputation.
- Log what they pushed back on into `docs/SALES_PLAYBOOK.md §5`. Every real
  objection makes the next call better.
- If they said yes: `docs/IMPLEMENTATION_GUIDE.md`, start at §1.

---

## 8. Hard rules

- **Never demo an unrehearsed path.** The course is honest; the demo has to be.
- **Never claim the instructor dashboard, a third-party WCAG audit, Spanish, or
  under-13 accounts.** All roadmap. See `SALES_PLAYBOOK.md §8`.
- **Never quote a fraud statistic you have not sourced this week.**
- If something breaks live: *"Let me show you that on another lesson — and
  I'll have an answer for you tomorrow."* Then actually answer tomorrow.
- Never demo on a phone or a narrow window. The site will show a "use a bigger
  screen" guard, which is correct behavior and a terrible first impression.
