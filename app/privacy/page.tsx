import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy — LearnAComputer",
  description: "What LearnAComputer stores, where it stores it, and how to erase it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="27 July 2026">
      <p>
        The short version: this site keeps your lesson progress in your own browser and sends
        nothing about it anywhere. You can erase all of it from inside the site in two clicks.
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

      <h2>Accounts</h2>
      <p>
        Accounts are optional and there is no password. If the operator of this installation has
        enabled them, the sign-in page asks for an email address and sends a one-time code to it.
        Sign-in is handled by Supabase, a third-party service, which stores your email address on
        its own servers under its own privacy policy.
      </p>
      <p>
        While you are signed in, the list of lessons you have finished is copied to your account so
        it follows you to another computer. That list is the only thing stored: no lesson answers,
        nothing you typed into the practice apps, and nothing from the missions that read your own
        files. Other learners cannot see it — the database allows each account to read and write
        only its own row, unless you join a class, which is described next.
      </p>

      <h2>Classes</h2>
      <p>
        If you are learning with a teacher, a librarian or a helper, they can make a class and give
        you a six-character code. Typing that code on the{" "}
        <Link href="/join">Join a class</Link> page is the only way anybody else is ever allowed to
        see your progress. Nothing is shared until you do it.
      </p>
      <p>
        Once you have joined, the person who made that class can see two things: the name you chose
        to be shown as, and which lessons you have finished. They cannot see your email address, how
        long you took, how many tries anything needed, what you typed inside a lesson, or anything
        from the missions that look at your own files — none of that is recorded anywhere, for
        anyone. They cannot see any other class, and no other learner in the class can see you.
      </p>
      <p>
        You can leave a class at any time on the same page. Leaving stops the sharing at once and
        does not touch your own progress.
      </p>
      <p>
        <strong>Reset all progress</strong> on the Lessons page clears the account copy as well as
        the device copy. If accounts have not been enabled, the sign-in page will say so, and the
        whole course works without one.
      </p>

      <h2>Analytics and advertising</h2>
      <p>
        There is no advertising network, no social media pixel, and nothing that follows you to
        other websites. We do count page views, using the measurement built into Vercel, the
        company that hosts this site. It records which page was opened, roughly where in the world
        the request came from, and what kind of device and browser it was. It sets no cookie, gives
        you no identifier, and cannot tell one visitor from another or link a visit to a person.
      </p>
      <p>
        It never sees anything from inside a lesson: not your progress, not your answers, not
        anything you type into the practice apps. We use it to know which lessons are being opened
        and whether pages are working, and for nothing else.
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
        The site does not knowingly collect personal information from anyone, including children. If
        accounts are enabled on this installation, an email address is the only personal detail
        involved.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the date at the top of the page changes with it. There is no mailing
        list to notify, because there is no mailing list.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy should go to whoever operates this installation of the site. If you
        are running it yourself, replace this paragraph with your own contact details before
        publishing.
      </p>
    </LegalPage>
  );
}
