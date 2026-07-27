import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — LearnAComputer",
  description: "The terms you agree to by using LearnAComputer.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="27 July 2026">
      <p>
        By using this site you agree to what follows. It is short, because the site does little that
        needs governing: it teaches computer skills and stores your progress in your own browser.
      </p>

      <h2>What you may do</h2>
      <p>
        Use the course, for yourself or with someone you are helping to learn. Work through it in any
        order, repeat any lesson, and reset your progress whenever you like.
      </p>

      <h2>What you may not do</h2>
      <ul>
        <li>Attempt to break, overload, or gain unauthorised access to the site or its host.</li>
        <li>Copy the lesson content and present it as your own.</li>
        <li>Use the site to store or transmit anything unlawful.</li>
      </ul>

      <h2>The teaching is general, not advice</h2>
      <p>
        The lessons describe how computers usually behave. Your own computer may differ — buttons
        move, menus get renamed, and systems are updated. Nothing here is professional advice about
        your specific machine, your security, your finances, or your legal position.
      </p>
      <p>
        The security unit in particular teaches habits that reduce risk. It cannot eliminate risk. If
        you believe an account of yours has been compromised, contact that provider directly rather
        than relying on anything you read here.
      </p>

      <h2>The simulator is not real</h2>
      <p>
        Everything inside a lesson activity is a simulation. The websites end in{" "}
        <code>.example</code>, the contacts are invented, and the shops sell nothing. No real email
        is sent, no real file is deleted, and no real money can move. Practising here cannot damage
        anything.
      </p>
      <p>
        The corresponding warning is that succeeding here is not the same as succeeding on your own
        computer. That is why most units end with a lesson asking you to try the same thing on your
        real machine.
      </p>

      <h2>Availability</h2>
      <p>
        The site is provided as-is, with no promise that it will be available, complete, or free of
        errors. Your progress lives in your browser, so clearing your browser data or switching
        devices will lose it. See the <Link href="/privacy">privacy page</Link>.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, the operator of this site is not liable for any loss arising
        from your use of it, including loss of data or damage to your own computer.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may change. The date at the top shows when they last did. Continuing to use the
        site means accepting the current version.
      </p>
    </LegalPage>
  );
}
