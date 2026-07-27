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
        The site can be run with optional accounts. If the operator of this installation has enabled
        them, the sign-in page will accept an email address and password, which are handled by
        Supabase, a third-party authentication service. In that case Supabase stores your email
        address and a hashed password on its own servers under its own privacy policy.
      </p>
      <p>
        If accounts have not been enabled, the sign-in page will tell you so, and you can use the
        whole course without one. No part of the course requires an account.
      </p>

      <h2>Analytics and advertising</h2>
      <p>
        There are none. No analytics script, no advertising network, no third-party trackers, no
        social media pixels. The pages you visit are not recorded anywhere we can see.
      </p>

      <h2>What the practice simulator is</h2>
      <p>
        The email, browser, messaging and photo apps inside the lessons are simulations that run
        entirely in your browser. The websites, email addresses, contacts and photographs in them are
        invented. Nothing you type into them is transmitted, and no real message, email or purchase
        can be made from inside a lesson.
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
