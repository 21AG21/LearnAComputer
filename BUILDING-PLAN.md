# Building Plan: Rebuild Units 6-12 as Hands-On Guided Activities

## Context

This plan converts every remaining `multiple-choice`, `drag-sort-files`, `spot-the-fake`, `find-in-settings`, and `url-navigator` lesson into a hands-on guided activity. The project philosophy is clear: **learners must click, type, and manipulate realistic simulations — never answer quiz questions.**

Units 1-5 are already done. Units 3/4/5 use the `guided-files`, `guided-browser`, and `guided-messaging` step-engine pattern respectively. Unit 6 needs a new `guided-email` simulator. Units 7-8 need a new `guided-photos` simulator. Unit 9 already has `find-in-settings` which IS hands-on (navigating a Settings UI and toggling switches) — **keep it as-is**. Units 10-12 need a mix of new simulators and reuse of existing ones.

---

## Architecture: The Step-Engine Pattern

All guided simulators follow the same pattern (see `GuidedFilesTask.tsx`, `GuidedBrowserTask.tsx`, `GuidedMessagingTask.tsx` for reference):

```tsx
// Step engine pattern (pseudocode):
const [stepIdx, setStepIdx] = useState(0);
const [phase, setPhase] = useState(0); // for multi-phase actions
const [flash, setFlash] = useState(false);

function hl(kind: string, name?: string): string {
  // Returns "ring-4 ring-yellow-400 animate-pulse" if the current step
  // targets this element, otherwise ""
}

function completeStep() {
  setFlash(true);
  setTimeout(() => {
    setFlash(false);
    if (stepIdx + 1 >= steps.length) {
      onResult(true); // DONE
    } else {
      setStepIdx(s => s + 1);
      setPhase(0);
    }
  }, 400);
}

// UI: dark banner at top with "Step N of M" + progress bar + step.say text
// When done: green "DONE" overlay with goal text
```

---

## Phase 1: Unit 6 — Email (New Component: `GuidedEmailTask`)

### New component needed: `components/Playground/GuidedEmailTask.tsx`

A full email client simulator with:
- **Inbox list** (4-5 preset emails with from/subject/preview/date)
- **Reading pane** (shows email body when selected)
- **Compose window** (To, CC, BCC, Subject, Body, Attach button, Send button)
- **Folders sidebar**: Inbox, Sent, Drafts, Spam, Archive
- **Action buttons**: Reply, Forward, Delete, Mark as Spam, Archive

#### Actions for the step engine:

| Action | Fields | What learner does |
|--------|--------|-------------------|
| `open-email` | `target` (subject string) | Click an email in the inbox list |
| `compose` | — | Click the New Email / Compose button |
| `set-to` | `value` | Type in the To field |
| `set-cc` | `value` | Type in the CC field |
| `set-bcc` | `value` | Type in the BCC field |
| `set-subject` | `value` | Type in the Subject field |
| `set-body` | `value` | Type in the Body field (partial match — must contain value) |
| `attach` | — | Click the Attach button (simulated — shows a "file attached" pill) |
| `send` | — | Click Send |
| `reply` | — | Click Reply button on the open email |
| `forward` | — | Click Forward button on the open email |
| `delete` | `target` (subject) | Delete an email (click email, then delete) |
| `mark-spam` | `target` (subject) | Mark an email as spam |
| `archive` | `target` (subject) | Archive an email |
| `go-to-folder` | `target` (folder name) | Click a folder in the sidebar |

#### Preset emails (hardcoded in component):

```
1. From: "Mom" | Subject: "Dinner Sunday?" | Body: "Hi! Are we still on for dinner this Sunday? Let me know! Love, Mom"
2. From: "Dr. Digital" | Subject: "Great Progress!" | Body: "You're doing wonderfully in the lessons! Keep it up."
3. From: "Amazon" | Subject: "Your order shipped" | Body: "Your order #38291 has shipped. Track at amazon.com/orders."
4. From: "URGENT WIN" | Subject: "You won $1,000,000!!!" | Body: "Click here NOW to claim your prize! Send your bank details to verify..."
5. From: "Boss" | Subject: "Meeting Tuesday" | Body: "Don't forget our team meeting at 2pm Tuesday. See you there!"
```

#### Type definition (add to `lib/lessons.ts`):

```typescript
| {
    type: "guided-email";
    goal: string;
    steps: Array<{
      say: string;
      action: "open-email" | "compose" | "set-to" | "set-cc" | "set-bcc" | "set-subject" | "set-body" | "attach" | "send" | "reply" | "forward" | "delete" | "mark-spam" | "archive" | "go-to-folder";
      target?: string;
      value?: string;
    }>;
  }
```

#### Lesson rewrites for Unit 6:

**`email-basics.json`** (order 600, module "Email Essentials") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-email",
    "goal": "You explored the email inbox and read an email",
    "steps": [
      { "say": "Click on the email from Mom to read it.", "action": "open-email", "target": "Dinner Sunday?" },
      { "say": "Now click on the email from Dr. Digital.", "action": "open-email", "target": "Great Progress!" },
      { "say": "Click Inbox in the sidebar to go back to all emails.", "action": "go-to-folder", "target": "Inbox" }
    ]
  }
}
```

**`inbox-organization.json`** (order 610, module "Email Essentials") — Currently drag-sort-files
```json
{
  "playgroundTask": {
    "type": "guided-email",
    "goal": "You organized your inbox like a pro",
    "steps": [
      { "say": "That 'You won $1,000,000!!!' email is spam. Click on it.", "action": "open-email", "target": "You won $1,000,000!!!" },
      { "say": "Mark this scam email as Spam.", "action": "mark-spam", "target": "You won $1,000,000!!!" },
      { "say": "Click on 'Your order shipped' from Amazon.", "action": "open-email", "target": "Your order shipped" },
      { "say": "You don't need this anymore. Archive it.", "action": "archive", "target": "Your order shipped" },
      { "say": "Click Spam in the sidebar to see where spam goes.", "action": "go-to-folder", "target": "Spam" }
    ]
  }
}
```

**`cc-bcc.json`** (order 640, module "Composing Email") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-email",
    "goal": "You used CC and BCC to send copies of an email",
    "steps": [
      { "say": "Click Compose to start a new email.", "action": "compose" },
      { "say": "Type mom@example.com in the To field.", "action": "set-to", "value": "mom@example.com" },
      { "say": "Add your sister to CC — type sister@example.com in the CC field.", "action": "set-cc", "value": "sister@example.com" },
      { "say": "Add yourself secretly to BCC — type me@example.com in the BCC field.", "action": "set-bcc", "value": "me@example.com" },
      { "say": "Type 'Family Dinner' as the subject.", "action": "set-subject", "value": "Family Dinner" },
      { "say": "Send the email.", "action": "send" }
    ]
  }
}
```

**`reply-forward.json`** (order 630, module "Composing Email") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-email",
    "goal": "You replied to an email and forwarded another",
    "steps": [
      { "say": "Open the email from Mom.", "action": "open-email", "target": "Dinner Sunday?" },
      { "say": "Click Reply to respond to Mom.", "action": "reply" },
      { "say": "Type your reply: 'Yes! See you at 6!'", "action": "set-body", "value": "Yes! See you at 6!" },
      { "say": "Send your reply.", "action": "send" },
      { "say": "Now open the email from Boss.", "action": "open-email", "target": "Meeting Tuesday" },
      { "say": "Forward this to a colleague — click Forward.", "action": "forward" },
      { "say": "Type colleague@example.com in the To field.", "action": "set-to", "value": "colleague@example.com" },
      { "say": "Send the forwarded email.", "action": "send" }
    ]
  }
}
```

**`attachments.json`** (order 650, module "Email Documents") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-email",
    "goal": "You attached a file and sent it",
    "steps": [
      { "say": "Click Compose to start a new email.", "action": "compose" },
      { "say": "Type friend@example.com in the To field.", "action": "set-to", "value": "friend@example.com" },
      { "say": "Type 'Vacation Photos' as the subject.", "action": "set-subject", "value": "Vacation Photos" },
      { "say": "Click the Attach button to add a file.", "action": "attach" },
      { "say": "Type a message: 'Here are the photos from our trip!'", "action": "set-body", "value": "Here are the photos" },
      { "say": "Send the email with the attachment.", "action": "send" }
    ]
  }
}
```

**`managing-email.json`** (order 660, module "Email Documents") — Currently drag-sort-files
```json
{
  "playgroundTask": {
    "type": "guided-email",
    "goal": "You managed your inbox by deleting and archiving",
    "steps": [
      { "say": "Open the email from Amazon.", "action": "open-email", "target": "Your order shipped" },
      { "say": "You already got your package. Delete this email.", "action": "delete", "target": "Your order shipped" },
      { "say": "Open the email from Boss.", "action": "open-email", "target": "Meeting Tuesday" },
      { "say": "The meeting is over. Archive this email to keep it but clear your inbox.", "action": "archive", "target": "Meeting Tuesday" },
      { "say": "Check the Sent folder to see emails you've sent.", "action": "go-to-folder", "target": "Sent" }
    ]
  }
}
```

**`spam-phishing.json`** (order 670, module "Email Safety") — Currently spot-the-fake
```json
{
  "playgroundTask": {
    "type": "guided-email",
    "goal": "You identified and reported a phishing email",
    "steps": [
      { "say": "Look at your inbox. One email looks suspicious. Click on 'You won $1,000,000!!!' to inspect it.", "action": "open-email", "target": "You won $1,000,000!!!" },
      { "say": "This is a scam! Mark it as Spam so you won't see emails like this again.", "action": "mark-spam", "target": "You won $1,000,000!!!" },
      { "say": "Go to the Spam folder to confirm it moved there.", "action": "go-to-folder", "target": "Spam" }
    ]
  }
}
```

### Wire into system:
1. Add `guided-email` to `PlaygroundTask` union in `lib/lessons.ts`
2. Create `components/Playground/GuidedEmailTask.tsx`
3. Add routing in `components/LessonPlaygroundPane.tsx`
4. Rewrite all 7 lesson JSONs above

---

## Phase 2: Unit 7 — Photos (New Component: `GuidedPhotosTask`)

### New component needed: `components/Playground/GuidedPhotosTask.tsx`

A photo management app simulator with:
- **Photo grid** (12-16 colored placeholder squares with labels like "Beach Sunset", "Family Dinner", "Dog in Park", etc.)
- **Albums sidebar**: All Photos, Favorites, People, Albums list (Vacation, Family, Pets)
- **Photo viewer** (click a photo to enlarge — shows the colored square big with title)
- **Editing panel** (Crop, Rotate, Brightness slider, Filter buttons, Revert)
- **Action bar**: Favorite (heart), Share, Delete, Add to Album

#### Actions for the step engine:

| Action | Fields | What learner does |
|--------|--------|-------------------|
| `select-photo` | `target` (photo label) | Click a photo in the grid |
| `favorite` | — | Click the heart/favorite button on selected photo |
| `unfavorite` | — | Click heart again to remove from favorites |
| `delete` | — | Click delete on selected photo |
| `recover` | `target` (photo label) | Recover a photo from Recently Deleted |
| `create-album` | `value` (album name) | Click + New Album, type name |
| `add-to-album` | `value` (album name) | Click "Add to Album" on selected photo, pick album |
| `go-to-album` | `target` (album name or "All Photos" / "Favorites" / "People" / "Recently Deleted") | Click a section in the sidebar |
| `crop` | — | Click crop tool (simulated — photo gets a crop overlay and auto-applies) |
| `rotate` | — | Click rotate button |
| `adjust-brightness` | — | Drag the brightness slider |
| `apply-filter` | `value` (filter name: "Vivid" / "Dramatic" / "B&W") | Click a filter |
| `revert` | — | Click "Revert to Original" |
| `share` | — | Click Share button (shows a simulated share sheet) |
| `search` | `value` (search term) | Type in the search bar |

#### Preset photos (hardcoded, represented as colored squares with emoji + label):

```
All Photos (12 items):
  🌅 Beach Sunset (orange)      👨‍👩‍👧 Family Dinner (warm red)
  🐕 Dog in Park (green)        🎂 Birthday Cake (pink)
  🏔️ Mountain Hike (blue)       🌺 Garden Flowers (purple)
  🐱 Cat Sleeping (gray)        🎄 Holiday Tree (dark green)
  📸 Selfie (yellow)            🍕 Pizza Night (red)
  🚗 Road Trip (teal)           ⛱️ Beach Day (sky blue)
```

#### Type definition (add to `lib/lessons.ts`):

```typescript
| {
    type: "guided-photos";
    goal: string;
    steps: Array<{
      say: string;
      action: "select-photo" | "favorite" | "unfavorite" | "delete" | "recover" | "create-album" | "add-to-album" | "go-to-album" | "crop" | "rotate" | "adjust-brightness" | "apply-filter" | "revert" | "share" | "search";
      target?: string;
      value?: string;
    }>;
  }
```

#### Lesson rewrites for Unit 7:

**`photos-app.json`** (order 700, module "Managing Photos") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-photos",
    "goal": "You browsed your photo library and viewed photos",
    "steps": [
      { "say": "Click on 'Beach Sunset' to view it.", "action": "select-photo", "target": "Beach Sunset" },
      { "say": "Now go back and click on 'Dog in Park'.", "action": "select-photo", "target": "Dog in Park" },
      { "say": "Click 'All Photos' in the sidebar to see all your photos.", "action": "go-to-album", "target": "All Photos" }
    ]
  }
}
```

**`photo-favorites.json`** (order 710, module "Managing Photos") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-photos",
    "goal": "You added and removed favorites",
    "steps": [
      { "say": "Click on 'Beach Sunset' to select it.", "action": "select-photo", "target": "Beach Sunset" },
      { "say": "Click the heart icon to add it to Favorites.", "action": "favorite" },
      { "say": "Now select 'Cat Sleeping'.", "action": "select-photo", "target": "Cat Sleeping" },
      { "say": "Add this one to Favorites too.", "action": "favorite" },
      { "say": "Go to Favorites in the sidebar to see your picks.", "action": "go-to-album", "target": "Favorites" }
    ]
  }
}
```

**`photo-albums.json`** (order 720, module "Managing Photos") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-photos",
    "goal": "You created an album and organized photos into it",
    "steps": [
      { "say": "Create a new album — click + New Album.", "action": "create-album", "value": "Vacation" },
      { "say": "Select 'Beach Sunset'.", "action": "select-photo", "target": "Beach Sunset" },
      { "say": "Add it to the Vacation album.", "action": "add-to-album", "value": "Vacation" },
      { "say": "Select 'Mountain Hike'.", "action": "select-photo", "target": "Mountain Hike" },
      { "say": "Add this one to Vacation too.", "action": "add-to-album", "value": "Vacation" },
      { "say": "Go to the Vacation album to see your photos.", "action": "go-to-album", "target": "Vacation" }
    ]
  }
}
```

**`photo-editing.json`** (order 740, module "Editing Photos") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-photos",
    "goal": "You edited a photo and reverted to the original",
    "steps": [
      { "say": "Select 'Beach Sunset' to open it.", "action": "select-photo", "target": "Beach Sunset" },
      { "say": "Crop the photo — click the Crop tool.", "action": "crop" },
      { "say": "Now rotate it — click Rotate.", "action": "rotate" },
      { "say": "Adjust the brightness — drag the brightness slider.", "action": "adjust-brightness" },
      { "say": "Don't like the changes? Click 'Revert to Original' to undo everything.", "action": "revert" }
    ]
  }
}
```

**`sharing-photos.json`** (order 750, module "Editing Photos") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-photos",
    "goal": "You shared a photo and applied a filter",
    "steps": [
      { "say": "Select 'Family Dinner'.", "action": "select-photo", "target": "Family Dinner" },
      { "say": "Apply the 'Vivid' filter to make colors pop.", "action": "apply-filter", "value": "Vivid" },
      { "say": "Share this photo — click the Share button.", "action": "share" }
    ]
  }
}
```

**`photo-people.json`** (order 730, module "Organizing Photos") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-photos",
    "goal": "You used search to find photos",
    "steps": [
      { "say": "Search for 'beach' using the search bar.", "action": "search", "value": "beach" },
      { "say": "Click on 'Beach Sunset' from the results.", "action": "select-photo", "target": "Beach Sunset" },
      { "say": "Go to the People section in the sidebar.", "action": "go-to-album", "target": "People" }
    ]
  }
}
```

**`icloud-photos.json`** (order 760, module "Cloud Storage") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-photos",
    "goal": "You recovered a deleted photo from Recently Deleted",
    "steps": [
      { "say": "Select 'Pizza Night'.", "action": "select-photo", "target": "Pizza Night" },
      { "say": "Delete this photo.", "action": "delete" },
      { "say": "Go to 'Recently Deleted' in the sidebar.", "action": "go-to-album", "target": "Recently Deleted" },
      { "say": "Oops — you wanted that! Click on 'Pizza Night' to recover it.", "action": "recover", "target": "Pizza Night" },
      { "say": "Go back to All Photos to confirm it's restored.", "action": "go-to-album", "target": "All Photos" }
    ]
  }
}
```

**`recently-deleted.json`** (order 770, module "Cloud Storage") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-photos",
    "goal": "You understand how Recently Deleted works",
    "steps": [
      { "say": "Select 'Road Trip'.", "action": "select-photo", "target": "Road Trip" },
      { "say": "Delete this photo.", "action": "delete" },
      { "say": "Go to 'Recently Deleted'.", "action": "go-to-album", "target": "Recently Deleted" },
      { "say": "The photo is here! It stays for 30 days. Recover it now.", "action": "recover", "target": "Road Trip" }
    ]
  }
}
```

### Wire into system:
1. Add `guided-photos` to `PlaygroundTask` union in `lib/lessons.ts`
2. Create `components/Playground/GuidedPhotosTask.tsx`
3. Add routing in `components/LessonPlaygroundPane.tsx`
4. Rewrite all 8 lesson JSONs above

---

## Phase 3: Unit 8 — Apps (New Component: `GuidedAppStoreTask`)

### New component needed: `components/Playground/GuidedAppStoreTask.tsx`

An app store / app management simulator with:
- **App store view**: Featured apps grid, search bar, categories (Productivity, Social, Games, Utilities)
- **App detail page**: name, icon, description, "Install" button, rating, permissions list
- **Installed apps view**: list of apps with "Open", "Update", "Delete" buttons
- **Permissions popup**: when installing, shows what the app needs (Camera, Location, Contacts, etc.) with Allow/Deny buttons
- **Update available badge**: some apps show "Update Available"

#### Actions for the step engine:

| Action | Fields | What learner does |
|--------|--------|-------------------|
| `search` | `value` (search term) | Type in the app store search bar |
| `select-app` | `target` (app name) | Click an app to view its details |
| `install` | — | Click the Install button |
| `allow-permission` | `value` (permission name) | Allow a permission in the popup |
| `deny-permission` | `value` (permission name) | Deny a permission in the popup |
| `go-to-installed` | — | Click the "My Apps" / Installed tab |
| `go-to-store` | — | Click the "Store" / Browse tab |
| `update-app` | `target` (app name) | Click Update on an app |
| `delete-app` | `target` (app name) | Click Delete on an installed app |
| `open-app` | `target` (app name) | Click Open on an installed app |
| `go-to-category` | `target` (category name) | Click a category tab |

#### Preset apps (hardcoded):

```
Store apps:
  📝 NoteMaster (Productivity) — "A simple note-taking app" — Needs: Storage
  📷 PhotoFun (Social) — "Share photos with friends" — Needs: Camera, Photos, Location
  🎮 Puzzle Quest (Games) — "A relaxing puzzle game" — Needs: None
  ☁️ WeatherNow (Utilities) — "Accurate weather forecasts" — Needs: Location
  💬 ChatBuddy (Social) — "Message your friends" — Needs: Contacts, Camera, Microphone
  🧮 Calculator Pro (Utilities) — "Advanced calculator" — Needs: None

Already installed:
  🌐 Browser (pre-installed)
  📁 Files (pre-installed)
  📧 Mail (pre-installed)
  ☁️ WeatherNow (has update available)
```

#### Type definition (add to `lib/lessons.ts`):

```typescript
| {
    type: "guided-app-store";
    goal: string;
    steps: Array<{
      say: string;
      action: "search" | "select-app" | "install" | "allow-permission" | "deny-permission" | "go-to-installed" | "go-to-store" | "update-app" | "delete-app" | "open-app" | "go-to-category";
      target?: string;
      value?: string;
    }>;
  }
```

#### Lesson rewrites for Unit 8:

**`app-vs-website.json`** (order 800, module "Understanding Apps") — Currently drag-sort-files
```json
{
  "playgroundTask": {
    "type": "guided-app-store",
    "goal": "You explored the app store and found an app",
    "steps": [
      { "say": "You're in the app store. Browse the Productivity category.", "action": "go-to-category", "target": "Productivity" },
      { "say": "Click on NoteMaster to see its details.", "action": "select-app", "target": "NoteMaster" },
      { "say": "Go back and browse Games.", "action": "go-to-category", "target": "Games" },
      { "say": "Click on Puzzle Quest.", "action": "select-app", "target": "Puzzle Quest" }
    ]
  }
}
```

**`app-store.json`** (order 810, module "Understanding Apps") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-app-store",
    "goal": "You searched for and found an app",
    "steps": [
      { "say": "Search for 'weather' in the app store.", "action": "search", "value": "weather" },
      { "say": "Click on WeatherNow to see more about it.", "action": "select-app", "target": "WeatherNow" },
      { "say": "Search for 'puzzle' to find a game.", "action": "search", "value": "puzzle" },
      { "say": "Click on Puzzle Quest.", "action": "select-app", "target": "Puzzle Quest" }
    ]
  }
}
```

**`installing-apps.json`** (order 820, module "Installing Apps") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-app-store",
    "goal": "You installed an app from the store",
    "steps": [
      { "say": "Search for 'note'.", "action": "search", "value": "note" },
      { "say": "Click on NoteMaster.", "action": "select-app", "target": "NoteMaster" },
      { "say": "Click Install to download it.", "action": "install" },
      { "say": "The app needs Storage access. Click Allow.", "action": "allow-permission", "value": "Storage" },
      { "say": "Go to My Apps to see it installed.", "action": "go-to-installed" }
    ]
  }
}
```

**`app-permissions.json`** (order 830, module "Installing Apps") — Currently find-in-settings
```json
{
  "playgroundTask": {
    "type": "guided-app-store",
    "goal": "You reviewed and managed app permissions",
    "steps": [
      { "say": "Click on ChatBuddy to view its details.", "action": "select-app", "target": "ChatBuddy" },
      { "say": "Install ChatBuddy.", "action": "install" },
      { "say": "It wants Camera access. Allow it — you need it for video calls.", "action": "allow-permission", "value": "Camera" },
      { "say": "It wants your Contacts. Allow it so you can find friends.", "action": "allow-permission", "value": "Contacts" },
      { "say": "It wants Microphone access. Allow it for voice messages.", "action": "allow-permission", "value": "Microphone" }
    ]
  }
}
```

**`updating-apps.json`** (order 840, module "Managing Apps") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-app-store",
    "goal": "You updated an app to the latest version",
    "steps": [
      { "say": "Go to My Apps to see your installed apps.", "action": "go-to-installed" },
      { "say": "WeatherNow has an update available. Click Update.", "action": "update-app", "target": "WeatherNow" },
      { "say": "Go back to the Store to browse.", "action": "go-to-store" }
    ]
  }
}
```

**`deleting-apps.json`** (order 850, module "Managing Apps") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-app-store",
    "goal": "You removed an app you no longer need",
    "steps": [
      { "say": "Go to My Apps.", "action": "go-to-installed" },
      { "say": "You don't use Puzzle Quest anymore. Delete it.", "action": "delete-app", "target": "Puzzle Quest" },
      { "say": "Go back to the Store — you can always reinstall later.", "action": "go-to-store" }
    ]
  }
}
```

**`free-vs-paid.json`** (order 860, module "Managing Apps") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-app-store",
    "goal": "You compared free and paid apps",
    "steps": [
      { "say": "Search for 'calculator'.", "action": "search", "value": "calculator" },
      { "say": "Click on Calculator Pro to see its details (it's free!).", "action": "select-app", "target": "Calculator Pro" },
      { "say": "Go browse the Social category to see paid apps.", "action": "go-to-category", "target": "Social" },
      { "say": "Click on PhotoFun to compare.", "action": "select-app", "target": "PhotoFun" }
    ]
  }
}
```

### Wire into system:
1. Add `guided-app-store` to `PlaygroundTask` union in `lib/lessons.ts`
2. Create `components/Playground/GuidedAppStoreTask.tsx`
3. Add routing in `components/LessonPlaygroundPane.tsx`
4. Rewrite all 7 lesson JSONs above

---

## Phase 4: Unit 9 — Settings (KEEP AS-IS)

Unit 9 already uses `find-in-settings` which IS hands-on — the learner navigates a simulated System Settings UI, finds the right panel, and toggles a switch. This is already the correct pattern. **No changes needed.**

Current lessons (all `find-in-settings`):
- `system-settings.json` — Customizing Your computer
- `display-theme.json` — Appearance
- `accessibility.json` — Customizing Your computer
- `notifications-sound.json` — System Behavior
- `storage-battery.json` — System Behavior
- `trackpad-keyboard.json` — Hardware

---

## Phase 5: Unit 10 — Online Safety (Mixed: reuse existing + new `GuidedSecurityTask`)

### New component needed: `components/Playground/GuidedSecurityTask.tsx`

A security/password training simulator with:
- **Password tester**: shows a text input where learner types a password, with a real-time strength meter (Weak/Fair/Strong/Very Strong) based on length + character variety
- **Login page simulator**: fake login form where learner practices entering credentials
- **2FA simulator**: after login, shows a 6-digit code entry with a "code sent to phone" message
- **Phishing URL inspector**: shows an email or webpage with a link — learner hovers to reveal the real URL, then marks as "Safe" or "Dangerous"
- **Privacy settings panel**: toggle switches for Location, Camera, Microphone, Cookies, Ad Tracking

#### Actions for the step engine:

| Action | Fields | What learner does |
|--------|--------|-------------------|
| `type-password` | `value` (the password to type) | Type a password in the tester |
| `check-strength` | — | Click "Check Strength" (shows result) |
| `type-username` | `value` | Type in username field of login form |
| `type-login-password` | `value` | Type in password field of login form |
| `login` | — | Click Login button |
| `enter-2fa-code` | `value` (6-digit code) | Type the 2FA code |
| `verify-2fa` | — | Click Verify |
| `inspect-link` | `target` (link text) | Hover over a link to reveal real URL |
| `mark-safe` | — | Click "Safe" after inspecting |
| `mark-dangerous` | — | Click "Dangerous" after inspecting |
| `toggle-setting` | `target` (setting name), `value` ("on"/"off") | Toggle a privacy switch |
| `go-to-section` | `target` ("password-tester" / "login" / "2fa" / "phishing" / "privacy") | Switch between simulator sections |

#### Type definition (add to `lib/lessons.ts`):

```typescript
| {
    type: "guided-security";
    goal: string;
    steps: Array<{
      say: string;
      action: "type-password" | "check-strength" | "type-username" | "type-login-password" | "login" | "enter-2fa-code" | "verify-2fa" | "inspect-link" | "mark-safe" | "mark-dangerous" | "toggle-setting" | "go-to-section";
      target?: string;
      value?: string;
    }>;
  }
```

#### Lesson rewrites for Unit 10:

**`passwords-basics.json`** (order 1000, module "Passwords and Access") — Currently drag-sort-files
```json
{
  "playgroundTask": {
    "type": "guided-security",
    "goal": "You created and tested a strong password",
    "steps": [
      { "say": "Type a weak password: 'password123'", "action": "type-password", "value": "password123" },
      { "say": "Check its strength.", "action": "check-strength" },
      { "say": "Now try a strong one: 'Tr0ub4dor&3!xK'", "action": "type-password", "value": "Tr0ub4dor&3!xK" },
      { "say": "Check its strength — see the difference?", "action": "check-strength" }
    ]
  }
}
```

**`password-managers.json`** (order 1010, module "Passwords and Access") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-security",
    "goal": "You practiced logging in with a password manager",
    "steps": [
      { "say": "Go to the Login section.", "action": "go-to-section", "target": "login" },
      { "say": "Type your username: 'learner@example.com'", "action": "type-username", "value": "learner@example.com" },
      { "say": "Type a strong password: 'xW8!kLm#9qZv'", "action": "type-login-password", "value": "xW8!kLm#9qZv" },
      { "say": "Click Login.", "action": "login" }
    ]
  }
}
```

**`two-factor.json`** (order 1020, module "Passwords and Access") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-security",
    "goal": "You completed two-factor authentication",
    "steps": [
      { "say": "Go to the Login section.", "action": "go-to-section", "target": "login" },
      { "say": "Type your username: 'learner@example.com'", "action": "type-username", "value": "learner@example.com" },
      { "say": "Type your password: 'MyStr0ng!Pass'", "action": "type-login-password", "value": "MyStr0ng!Pass" },
      { "say": "Click Login.", "action": "login" },
      { "say": "A code was sent to your phone! Type it: '847291'", "action": "enter-2fa-code", "value": "847291" },
      { "say": "Click Verify to complete login.", "action": "verify-2fa" }
    ]
  }
}
```

**`passkeys.json`** (order 1030, module "Passwords and Access") — Currently multiple-choice

Change to `type: "none"` — passkeys are a concept explanation that doesn't have a natural simulator action. Keep the drDigitalIntro as teaching content.

**`scams-phishing.json`** (order 1050, module "Recognizing Threats") — Currently spot-the-fake
```json
{
  "playgroundTask": {
    "type": "guided-security",
    "goal": "You identified a phishing link",
    "steps": [
      { "say": "Go to the Phishing Inspector.", "action": "go-to-section", "target": "phishing" },
      { "say": "Hover over the first link to see where it really goes.", "action": "inspect-link", "target": "Verify your account" },
      { "say": "The real URL is 'bank-secure-login.fakesite.ru' — that's dangerous! Mark it.", "action": "mark-dangerous" },
      { "say": "Now inspect the second link.", "action": "inspect-link", "target": "View your order" },
      { "say": "The real URL is 'amazon.com/orders' — that's safe!", "action": "mark-safe" }
    ]
  }
}
```

**`identity-theft.json`** (order 1060, module "Recognizing Threats") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-security",
    "goal": "You locked down your privacy settings",
    "steps": [
      { "say": "Go to Privacy Settings.", "action": "go-to-section", "target": "privacy" },
      { "say": "Turn off Ad Tracking — companies don't need to follow you.", "action": "toggle-setting", "target": "Ad Tracking", "value": "off" },
      { "say": "Turn off Location sharing — only enable when you need it.", "action": "toggle-setting", "target": "Location", "value": "off" },
      { "say": "Turn off Cookies — this stops sites from tracking your browsing.", "action": "toggle-setting", "target": "Cookies", "value": "off" }
    ]
  }
}
```

**`software-updates.json`** (order 1080, module "System Health") — Currently `find-in-settings`. **KEEP AS-IS.** It uses the find-in-settings pattern which is already hands-on.

**`backups.json`** (order 1090, module "System Health") — Currently multiple-choice. Change to `type: "none"` — backups are conceptual (there's no natural guided action in a simulator).

**`public-wifi.json`** (order 1040, module "Online Transactions") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-security",
    "goal": "You checked a website's security before entering data",
    "steps": [
      { "say": "Go to the Phishing Inspector.", "action": "go-to-section", "target": "phishing" },
      { "say": "Inspect the link 'Free WiFi Login'.", "action": "inspect-link", "target": "Free WiFi Login" },
      { "say": "The URL is 'http://free-wifi-portal.net' (no HTTPS!) — it's dangerous!", "action": "mark-dangerous" },
      { "say": "Inspect 'Bank of America Login'.", "action": "inspect-link", "target": "Bank of America Login" },
      { "say": "The URL is 'https://bankofamerica.com/login' (HTTPS + real domain). Safe!", "action": "mark-safe" }
    ]
  }
}
```

**`safe-shopping.json`** (order 1045, module "Online Transactions") — Currently spot-the-fake
```json
{
  "playgroundTask": {
    "type": "guided-security",
    "goal": "You verified a shopping site before buying",
    "steps": [
      { "say": "Go to the Phishing Inspector.", "action": "go-to-section", "target": "phishing" },
      { "say": "Inspect 'Complete Your Purchase'.", "action": "inspect-link", "target": "Complete Your Purchase" },
      { "say": "Real URL: 'https://shop.example/checkout' — looks safe!", "action": "mark-safe" },
      { "say": "Inspect 'Claim 90% Discount NOW'.", "action": "inspect-link", "target": "Claim 90% Discount NOW" },
      { "say": "Real URL: 'http://deals-4u-cheap.xyz/buy' — no HTTPS, weird domain. Dangerous!", "action": "mark-dangerous" }
    ]
  }
}
```

### Wire into system:
1. Add `guided-security` to `PlaygroundTask` union in `lib/lessons.ts`
2. Create `components/Playground/GuidedSecurityTask.tsx`
3. Add routing in `components/LessonPlaygroundPane.tsx`
4. Rewrite 8 lesson JSONs above, keep `software-updates.json` (find-in-settings), change `passkeys.json` and `backups.json` to `type: "none"`

---

## Phase 6: Unit 11 — Troubleshooting (New Component: `GuidedTroubleshootingTask`)

### New component needed: `components/Playground/GuidedTroubleshootingTask.tsx`

A troubleshooting simulator that presents a "broken" computer scenario and walks the learner through diagnosing and fixing it:
- **Desktop view**: simplified desktop showing a frozen app, wifi icon (with X for disconnected), battery indicator, and a few app icons
- **Task Manager / Force Quit panel**: list of running apps with "Force Quit" buttons
- **WiFi settings panel**: toggle, network list, "Forget Network" button, "Reconnect" button
- **System panel**: "Restart", "Update", "Clear Storage", disk usage bar
- **Error messages**: popup alerts with the problem description
- **Search bar**: simulated "search for help online"

#### Actions for the step engine:

| Action | Fields | What learner does |
|--------|--------|-------------------|
| `read-error` | — | Click to dismiss/acknowledge the error popup |
| `open-task-manager` | — | Open the Force Quit / Task Manager panel |
| `force-quit` | `target` (app name) | Force quit a specific app |
| `restart-app` | `target` (app name) | Reopen an app after force quitting |
| `open-wifi-settings` | — | Open the WiFi panel |
| `toggle-wifi` | `value` ("on"/"off") | Toggle WiFi on/off |
| `reconnect-wifi` | — | Click Reconnect on a network |
| `forget-network` | `target` (network name) | Forget a saved network |
| `restart-computer` | — | Click Restart (simulated — shows spinner then "fresh" desktop) |
| `check-storage` | — | Open system panel and view disk usage |
| `clear-storage` | — | Click "Clear Storage" (simulated cleanup) |
| `update-system` | — | Click "Check for Updates" / Install Update |
| `search-help` | `value` (search query) | Type a search query in the help search bar |
| `check-cable` | `target` (device name) | Check/replug a peripheral cable |
| `change-input` | `target` (input source) | Switch input source (for keyboard/display issues) |

#### Type definition (add to `lib/lessons.ts`):

```typescript
| {
    type: "guided-troubleshooting";
    goal: string;
    scenario: string; // shown as the "problem" at the top
    steps: Array<{
      say: string;
      action: "read-error" | "open-task-manager" | "force-quit" | "restart-app" | "open-wifi-settings" | "toggle-wifi" | "reconnect-wifi" | "forget-network" | "restart-computer" | "check-storage" | "clear-storage" | "update-system" | "search-help" | "check-cable" | "change-input";
      target?: string;
      value?: string;
    }>;
  }
```

#### Lesson rewrites for Unit 11:

**`troubleshooting-basics.json`** (order 1110, module "Fixing Problems")
```json
{
  "playgroundTask": {
    "type": "guided-troubleshooting",
    "goal": "You fixed a frozen app using Force Quit",
    "scenario": "Your web browser has frozen and won't respond to clicks!",
    "steps": [
      { "say": "An error appeared! Read it and dismiss it.", "action": "read-error" },
      { "say": "Open the Task Manager to see running apps.", "action": "open-task-manager" },
      { "say": "Force Quit the frozen Browser.", "action": "force-quit", "target": "Browser" },
      { "say": "Now reopen the Browser to continue working.", "action": "restart-app", "target": "Browser" }
    ]
  }
}
```

**`software-problems.json`** (order 1120, module "Fixing Problems")
```json
{
  "playgroundTask": {
    "type": "guided-troubleshooting",
    "goal": "You resolved a software problem by restarting and updating",
    "scenario": "Your computer is running slowly and apps keep crashing.",
    "steps": [
      { "say": "An error appeared! Read it.", "action": "read-error" },
      { "say": "The first thing to try: restart the computer.", "action": "restart-computer" },
      { "say": "Still having issues? Check for system updates.", "action": "update-system" },
      { "say": "Search online for help with 'computer running slow after update'.", "action": "search-help", "value": "computer running slow after update" }
    ]
  }
}
```

**`hardware-problems.json`** (order 1130, module "Fixing Problems")
```json
{
  "playgroundTask": {
    "type": "guided-troubleshooting",
    "goal": "You diagnosed and fixed a hardware connection issue",
    "scenario": "Your external keyboard stopped working!",
    "steps": [
      { "say": "An error says 'Keyboard not detected'. Read it.", "action": "read-error" },
      { "say": "Check the keyboard cable — is it plugged in?", "action": "check-cable", "target": "Keyboard" },
      { "say": "The cable was loose! Now it's reconnected. Try a different USB port too.", "action": "check-cable", "target": "Keyboard" },
      { "say": "Search online: 'external keyboard not working'", "action": "search-help", "value": "external keyboard not working" }
    ]
  }
}
```

**`internet-problems.json`** (order 1140, module "Connectivity")
```json
{
  "playgroundTask": {
    "type": "guided-troubleshooting",
    "goal": "You fixed your internet connection",
    "scenario": "Your WiFi is connected but web pages won't load!",
    "steps": [
      { "say": "Open WiFi settings to check your connection.", "action": "open-wifi-settings" },
      { "say": "Try turning WiFi off.", "action": "toggle-wifi", "value": "off" },
      { "say": "Now turn it back on.", "action": "toggle-wifi", "value": "on" },
      { "say": "Reconnect to your network.", "action": "reconnect-wifi" },
      { "say": "Still not working? Forget the network and reconnect fresh.", "action": "forget-network", "target": "Home WiFi" }
    ]
  }
}
```

**`peripheral-problems.json`** (order 1150, module "Connectivity")
```json
{
  "playgroundTask": {
    "type": "guided-troubleshooting",
    "goal": "You reconnected a peripheral device",
    "scenario": "Your mouse and external monitor stopped working!",
    "steps": [
      { "say": "An error says 'Display not detected'. Read it.", "action": "read-error" },
      { "say": "Check the monitor cable.", "action": "check-cable", "target": "Monitor" },
      { "say": "Now check the mouse cable.", "action": "check-cable", "target": "Mouse" },
      { "say": "Change the display input source.", "action": "change-input", "target": "HDMI 1" },
      { "say": "Everything's reconnected! Restart to make sure it's detected.", "action": "restart-computer" }
    ]
  }
}
```

**`performance-storage.json`** (order 1160, module "Performance")
```json
{
  "playgroundTask": {
    "type": "guided-troubleshooting",
    "goal": "You freed up storage space on your computer",
    "scenario": "Your computer says 'Storage Almost Full' — it's slowing everything down!",
    "steps": [
      { "say": "An error says 'Low Storage'. Read it.", "action": "read-error" },
      { "say": "Check your storage usage.", "action": "check-storage" },
      { "say": "Clear unnecessary files to free up space.", "action": "clear-storage" },
      { "say": "Now open Task Manager to close apps using lots of memory.", "action": "open-task-manager" },
      { "say": "Force quit the app using the most resources.", "action": "force-quit", "target": "Video Editor" }
    ]
  }
}
```

**`password-recovery.json`** (order 1170, module "Access Issues")
```json
{
  "playgroundTask": {
    "type": "guided-security",
    "goal": "You recovered access using the password reset flow",
    "steps": [
      { "say": "Go to the Login section.", "action": "go-to-section", "target": "login" },
      { "say": "Type your email: 'learner@example.com'", "action": "type-username", "value": "learner@example.com" },
      { "say": "Type a wrong password: 'forgotit123'", "action": "type-login-password", "value": "forgotit123" },
      { "say": "Click Login (it will fail).", "action": "login" },
      { "say": "A reset code was sent! Enter it: '529174'", "action": "enter-2fa-code", "value": "529174" },
      { "say": "Click Verify to reset your password.", "action": "verify-2fa" }
    ]
  }
}
```

**`when-to-get-help.json`** (order 1180, module "Getting Support")
```json
{
  "playgroundTask": {
    "type": "guided-troubleshooting",
    "goal": "You found help online for a computer problem",
    "scenario": "You're getting a strange error message and don't know what to do.",
    "steps": [
      { "say": "An error appeared! Read it carefully.", "action": "read-error" },
      { "say": "Search for help: 'error code 0x80070005 fix'", "action": "search-help", "value": "error code 0x80070005 fix" },
      { "say": "The search suggests restarting. Try that.", "action": "restart-computer" }
    ]
  }
}
```

### Wire into system:
1. Add `guided-troubleshooting` to `PlaygroundTask` union in `lib/lessons.ts`
2. Create `components/Playground/GuidedTroubleshootingTask.tsx`
3. Add routing in `components/LessonPlaygroundPane.tsx`
4. Rewrite 7 lesson JSONs above
5. `password-recovery.json` reuses `guided-security` (Phase 5)

---

## Phase 7: Unit 12 — Everyday Life (Reuses existing simulators + new `GuidedCalendarTask`)

### New component needed: `components/Playground/GuidedCalendarTask.tsx`

A calendar and reminders simulator with:
- **Month view**: grid of days with a few preset events
- **Day view**: time slots with events
- **New event form**: Title, Date, Time, Repeat, Reminder
- **Reminders list**: checkable items with due dates
- **Sidebar**: Calendars list (Personal, Work), Reminders

#### Actions for the step engine:

| Action | Fields | What learner does |
|--------|--------|-------------------|
| `select-day` | `target` (date like "15" or "Monday") | Click a day in the calendar |
| `create-event` | — | Click the + / New Event button |
| `set-title` | `value` | Type event title |
| `set-time` | `value` (like "2:00 PM") | Set the event time |
| `set-repeat` | `value` ("Daily"/"Weekly"/"Monthly"/"None") | Set repeat option |
| `save-event` | — | Click Save |
| `create-reminder` | — | Click + New Reminder |
| `set-reminder-text` | `value` | Type reminder text |
| `save-reminder` | — | Click Save on the reminder |
| `complete-reminder` | `target` (reminder text) | Check off a reminder |
| `switch-view` | `target` ("month"/"day"/"reminders") | Switch calendar views |
| `select-calendar` | `target` ("Personal"/"Work") | Toggle a calendar on/off |

#### Type definition (add to `lib/lessons.ts`):

```typescript
| {
    type: "guided-calendar";
    goal: string;
    steps: Array<{
      say: string;
      action: "select-day" | "create-event" | "set-title" | "set-time" | "set-repeat" | "save-event" | "create-reminder" | "set-reminder-text" | "save-reminder" | "complete-reminder" | "switch-view" | "select-calendar";
      target?: string;
      value?: string;
    }>;
  }
```

#### Lesson rewrites for Unit 12:

**`calendar-reminders.json`** (order 1210, module "Organization") — Currently multiple-choice
```json
{
  "playgroundTask": {
    "type": "guided-calendar",
    "goal": "You created a calendar event and a reminder",
    "steps": [
      { "say": "Click on day 15 to select it.", "action": "select-day", "target": "15" },
      { "say": "Create a new event.", "action": "create-event" },
      { "say": "Title it 'Doctor Appointment'.", "action": "set-title", "value": "Doctor Appointment" },
      { "say": "Set the time to 2:00 PM.", "action": "set-time", "value": "2:00 PM" },
      { "say": "Save the event.", "action": "save-event" },
      { "say": "Now switch to Reminders view.", "action": "switch-view", "target": "reminders" },
      { "say": "Create a new reminder.", "action": "create-reminder" },
      { "say": "Type 'Buy groceries'.", "action": "set-reminder-text", "value": "Buy groceries" },
      { "say": "Save the reminder.", "action": "save-reminder" }
    ]
  }
}
```

**`daily-tasks.json`** (order 1200, module "Daily Computing") — Currently multiple-choice

Change to `type: "none"` — this is a conceptual overview of daily computing tasks. The intro text already teaches everything; a simulator would be forced.

**`notes-documents.json`** (order 1220, module "Creating Content") — Already `type-text`. **KEEP AS-IS.**

**`pdfs-reading.json`** (order 1230, module "Real-World Tasks") — Currently multiple-choice

Reuse `guided-browser`:
```json
{
  "playgroundTask": {
    "type": "guided-browser",
    "goal": "You downloaded and viewed a PDF",
    "steps": [
      { "say": "Navigate to recipebox.example to find a recipe.", "action": "navigate", "url": "recipebox.example" },
      { "say": "Click the download button to save the recipe as a PDF.", "action": "download" },
      { "say": "Open the Downloads panel to see your file.", "action": "open-downloads" }
    ]
  }
}
```

**`printing-scanning.json`** (order 1240, module "Real-World Tasks") — Currently multiple-choice

Change to `type: "none"` — printing and scanning are hardware-dependent actions that can't be meaningfully simulated. The intro text teaches the concept.

**`maps-navigation.json`** (order 1250, module "Finding Your Way") — Currently url-navigator

Reuse `guided-browser`:
```json
{
  "playgroundTask": {
    "type": "guided-browser",
    "goal": "You navigated to a website for directions",
    "steps": [
      { "say": "Type google.com in the address bar.", "action": "navigate", "url": "google.com" },
      { "say": "Search for 'directions to nearest library'.", "action": "search", "query": "directions to nearest library", "reveal": "Google" },
      { "say": "Open a new tab.", "action": "new-tab" },
      { "say": "Bookmark Google for quick access next time.", "action": "bookmark" }
    ]
  }
}
```

**`shopping-banking.json`** (order 1260, module "Online Services") — Currently spot-the-fake

Reuse `guided-security`:
```json
{
  "playgroundTask": {
    "type": "guided-security",
    "goal": "You verified a shopping site before entering payment info",
    "steps": [
      { "say": "Go to the Phishing Inspector.", "action": "go-to-section", "target": "phishing" },
      { "say": "Inspect the link 'Complete Purchase'.", "action": "inspect-link", "target": "Complete Purchase" },
      { "say": "URL is 'https://shop.example/checkout' — real domain, HTTPS. Safe!", "action": "mark-safe" },
      { "say": "Inspect 'Enter Card Details'.", "action": "inspect-link", "target": "Enter Card Details" },
      { "say": "URL is 'http://sh0p-deals.xyz/pay' — fake domain, no HTTPS. Dangerous!", "action": "mark-dangerous" }
    ]
  }
}
```

**`social-media.json`** (order 1270, module "Social and Entertainment") — Currently multiple-choice

Reuse `guided-messaging`:
```json
{
  "playgroundTask": {
    "type": "guided-messaging",
    "goal": "You practiced sending a message and sharing a photo",
    "steps": [
      { "say": "Click on Jordan to open their conversation.", "action": "select-contact", "target": "jordan" },
      { "say": "Send them a message: 'Check out this cool video!'", "action": "send-message", "value": "Check out this cool video!" },
      { "say": "Attach a photo to share.", "action": "attach-photo" }
    ]
  }
}
```

**`qrcodes-siri.json`** (order 1280, module "Smart Features") — Currently multiple-choice

Change to `type: "none"` — QR codes and voice assistants are device-dependent features that don't translate to a browser simulator. The intro text explains the concepts.

### Wire into system:
1. Add `guided-calendar` to `PlaygroundTask` union in `lib/lessons.ts`
2. Create `components/Playground/GuidedCalendarTask.tsx`
3. Add routing in `components/LessonPlaygroundPane.tsx`
4. Rewrite lesson JSONs as specified above
5. Several lessons reuse `guided-browser`, `guided-security`, `guided-messaging` (no new component needed for those)
6. Change `daily-tasks.json`, `printing-scanning.json`, `qrcodes-siri.json` to `type: "none"`

---

## Implementation Order (for Sonnet)

Execute phases in order. Each phase is independent and results in a commit.

### Per-phase checklist:

1. **Add type to `lib/lessons.ts`** — extend the `PlaygroundTask` union with the new type definition
2. **Build the component** — follow the step-engine pattern in `GuidedFilesTask.tsx` / `GuidedBrowserTask.tsx` / `GuidedMessagingTask.tsx`:
   - Dark banner at top: "Step N of M" + progress bar + `step.say`
   - `hl(kind, name?)` function for pulsing highlights
   - `completeStep()` advances with green flash
   - Green "DONE" screen at end with goal text
   - Call `onResult(true)` when all steps are complete
3. **Wire into `LessonPlaygroundPane.tsx`** — import and add the rendering block
4. **Rewrite lesson JSONs** — update each lesson file with the new `playgroundTask`
5. **Verify**: `npx tsc --noEmit` and `npm run build` must pass
6. **Test in browser**: start dev server, open one lesson from the unit, complete all steps to DONE
7. **Commit and push**

### Phase order:
- Phase 1: Unit 6 (`GuidedEmailTask`) — 1 new component, 7 lesson rewrites
- Phase 2: Unit 7 (`GuidedPhotosTask`) — 1 new component, 8 lesson rewrites
- Phase 3: Unit 8 (`GuidedAppStoreTask`) — 1 new component, 7 lesson rewrites
- Phase 4: Unit 9 — NO WORK NEEDED (already hands-on)
- Phase 5: Unit 10 (`GuidedSecurityTask`) — 1 new component, 8 lesson rewrites + 2 changed to `none`
- Phase 6: Unit 11 (`GuidedTroubleshootingTask`) — 1 new component, 7 lesson rewrites (1 reuses `guided-security`)
- Phase 7: Unit 12 (`GuidedCalendarTask`) — 1 new component, 4 lesson rewrites using new type + 3 reusing existing types + 3 changed to `none`

### Total new components: 5
### Total lesson rewrites: ~44 files
### Lessons changed to `type: "none"`: 5 (passkeys, backups, daily-tasks, printing-scanning, qrcodes-siri)
### Lessons kept as-is: `find-in-settings` (all of Unit 9 + software-updates), `notes-documents` (type-text)

---

## Critical Rules (MUST FOLLOW)

1. **ZERO multiple-choice.** After this plan is complete, `grep -r "multiple-choice" content/lessons/` must return zero results.
2. **ZERO drag-sort-files, spot-the-fake, url-navigator.** These are quiz-style activities being replaced.
3. **`find-in-settings` is allowed** — it's already hands-on (navigate + toggle).
4. **Platform-neutral language only.** No Mac, Apple, Finder, Safari, FaceTime, Command key, Dock, MacBook, App Store (as Apple's), iCloud, iPhone, iPad references. Use: computer, laptop, browser, file manager, video calling, Ctrl, taskbar, app store, cloud storage, phone, tablet.
5. **Follow the existing step-engine architecture exactly.** Don't invent new patterns. Copy the structure from `GuidedMessagingTask.tsx`.
6. **All `playgroundTask` types used must be defined in `lib/lessons.ts` `PlaygroundTask` union** and wired in `LessonPlaygroundPane.tsx`.
7. **Test each phase:** `npx tsc --noEmit`, `npm run build`, and visually verify in browser before committing.
8. **Update CLAUDE.md** after each phase: add the new type to the playground types table and add a schema section.

---

## Component Design Notes

### Visual style (match existing simulators):
- White/light-gray background with subtle borders
- Clear section headers
- Interactive elements use cursor-pointer
- Highlighted elements get: `ring-4 ring-yellow-400 animate-pulse` (the `hl()` function)
- Completion flash: brief green background pulse
- DONE screen: centered green checkmark + goal text + green "Complete" button

### State management:
- `useState` for step index, phase, flash, and component-specific state (selected items, input values, etc.)
- No external state management
- No localStorage (progress is handled by the parent `LessonModuleRunner`)

### Size constraints:
- Component renders inside a flex container in the playground pane
- Must fit in ~500px width (playground half of the lesson view)
- In fullscreen mode, gets the full viewport
- Use `overflow-y: auto` for content that might be tall
- Font size: `text-sm` for most UI, `text-xs` for metadata

### Multi-phase actions:
Some actions are 2-step (e.g. "click compose then fill in fields"). Use `phase` state:
- Phase 0: highlight the first thing to click
- Phase 1: after first click, highlight the next thing
- `completeStep()` only fires after the final phase

For `guided-email` example:
- `reply` action: Phase 0 = highlight Reply button, Phase 1 = pre-fills the compose form (step advances immediately since opening the form IS the action)
- `set-to` / `set-subject` / `set-body`: single-phase, just validate input contains `value` (case-insensitive partial match for body, exact for to/subject)
- `send`: single-phase, highlight Send button, complete on click
