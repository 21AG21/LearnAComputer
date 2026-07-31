import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy — LearnAComputer",
  description: "What LearnAComputer stores, where it stores it, and how to erase it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="28 July 2026">
      <p>
        The short version: there are no accounts, no cookies, no tracking, and no server storing
        anything about you. This site keeps your lesson progress in your own browser, and sends
        nothing about it anywhere. You can erase all of it from inside the site in two clicks.
      </p>

      <h2>Cookies</h2>
      <p>
        This site sets <strong>no cookies at all</strong> — not for advertising, not for analytics,
        not even for signing in, because there is nothing to sign in to. That is why you are not
        asked to accept anything.
      </p>
      <p>
        What it does use is your browser&apos;s local storage, which is the same idea kept entirely
        on your own machine: it is never attached to a request, never sent to us, and never shared
        with another site. Everything it holds is listed below. It does not expire, so you can come
        back in six months and carry on where you stopped.
      </p>

      <h2>The two feedback links</h2>
      <p>
        Two places on this site link out to a Google Form: <strong>Report a problem</strong> in the
        footer, and a course-evaluation card that appears once you are most of the way through the
        lessons. Both are ordinary links. Nothing is loaded from Google, and nothing is sent
        anywhere, unless <em>you</em> click one — at which point you are on a Google page and
        Google&apos;s terms apply, not ours.
      </p>
      <p>
        Both forms are optional and neither asks who you are. If you would rather not use Google at
        all, simply do not click them; nothing on this site depends on it.
      </p>

      <h2>What is stored on your device</h2>
      <p>
        Everything below is saved in your browser&apos;s local storage. It never leaves your
        computer, and we cannot read it.
      </p>
      <ul>
        <li>
          <strong>lac-progress</strong> — the list of lessons you have finished, so the site can
          show your progress and pick up where you left off.
        </li>
        <li>
          <strong>lac-sim</strong> — the state of the practice simulator, such as which pretend apps
          you installed, so later lessons make sense.
        </li>
        <li>
          <strong>lac-chats</strong> — the messages you typed into the practice messaging app. The
          contacts are fictional and no message is ever sent to anyone.
        </li>
        <li>
          <strong>lac-theme</strong> — whether you chose light or dark mode.
        </li>
        <li>
          <strong>lac-notice-seen</strong> — that you have read the notice at the top of the page, so
          it does not greet you again every time.
        </li>
      </ul>
      <p>
        None of this is a cookie in the tracking sense. It is not shared between sites, and it is not
        sent with any request.
      </p>

      <h2>Erasing it</h2>
      <p>
        The <Link href="/lessons">Lessons page</Link> has a <strong>Reset all progress</strong>{" "}
        button at the bottom. It clears your progress and the simulator state immediately. Clearing
        your browser&apos;s site data removes the rest.
      </p>
      <p>
        Because everything is stored on the device you are using, your progress will not follow you
        to a different computer, a different browser, or a private browsing window.
      </p>

      <h2>Analytics and advertising</h2>
      <p>
        There is none. No advertising network, no social media pixel, no analytics script, and
        nothing that follows you to other websites. We do not count page views and we do not know
        who visits or which lessons are opened.
      </p>
      <p>
        The company that hosts the site keeps ordinary server logs, as every web host does, and we
        do not use them to build any picture of you.
      </p>

      <h2>What the practice simulator is</h2>
      <p>
        The email, browser, messaging and photo apps inside the lessons are simulations that run
        entirely in your browser. The websites, email addresses, contacts and photographs in them are
        invented. Nothing you type into them is transmitted, and no real message, email or purchase
        can be made from inside a lesson.
      </p>

      <h2>The missions that read your own files</h2>
      <p>
        Each unit ends with a mission carried out on your real computer, and some steps ask you to
        hand something back: the folder you organized, a file you downloaded, a photo, a PDF you
        saved. Those steps use your browser&apos;s ordinary file and folder picker.
      </p>
      <p>
        Nothing you pick is uploaded. There is no server to upload it to: the checking code runs in
        the page, on your device, and the result is a message on screen. For a folder, the page
        receives the names and paths of the files inside it and nothing else. For a single file, it
        reads the name, the size, the type, the date it was last changed, and — for a picture — its
        width and height in order to tell you the shape. The contents are not sent anywhere, and the
        page keeps nothing after you close it.
      </p>
      <p>
        Two mission steps read a setting your browser already tells every website you visit: whether
        you prefer dark mode, and whether you have asked for reduced motion. One reads the battery
        level your browser reports, on the browsers that report it. Another notices when your
        computer goes offline. None of that is stored.
      </p>

      <h2>Children</h2>
      <p>
        The site collects no personal information from anyone, including children. There is no
        account, no name, no email address, and no way for us to know who a learner is.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the date at the top of the page changes with it. There is no mailing
        list to notify, because there is no mailing list.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy can go through the <strong>Report a problem</strong> link in the
        footer of any page. Because there is no account and nothing about you is collected or stored
        on any server, there is no personal record for us to look up, change, or delete — everything
        the site keeps lives on your own device, and the Reset all progress button clears it.
      </p>
    </LegalPage>
  );
}
