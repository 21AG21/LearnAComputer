"use client";

import { Component, type ReactNode } from "react";
import { REPORT_PROBLEM_URL, OPENS_GOOGLE_FORMS } from "@/lib/feedbackLinks";

interface Props {
  /** Remounts the activity from scratch — the same reset the Restart button does. */
  onRetry: () => void;
  children: ReactNode;
}

/**
 * Catches a runtime throw inside one activity so it cannot take the lesson page
 * with it. The lesson text, the skip button, and the navigation all live outside
 * this boundary and must survive any sim crash — for this audience a blank page
 * reads as "I broke the computer", which is the one thing this course exists to
 * unteach.
 *
 * app/error.tsx still backstops everything else; this boundary is only around
 * the playground pane, so recovery is "try the activity again", not "reload the
 * site".
 */
export default class ActivityErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // Surfaced for bug reports; the learner never needs to see this.
    console.error("Activity crashed:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="h-full w-full flex items-center justify-center border-4 border-gray-300 bg-white p-8">
        <div className="max-w-sm text-center">
          <p className="text-lg font-bold text-gray-900">This activity hit a problem</p>
          <p className="mt-2 text-gray-600">
            That was the activity&apos;s fault, not yours. Nothing is broken and no progress was
            lost.
          </p>
          <button
            onClick={() => {
              this.setState({ failed: false });
              this.props.onRetry();
            }}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700"
          >
            Try again
          </button>
          {/* The one moment a learner has something concrete to report. Second
              in line to Try again, because getting on with the lesson matters
              more than telling us — and it is a link, so nothing is sent
              anywhere unless they choose to. */}
          <p className="mt-4 text-sm text-gray-500">
            <a
              href={REPORT_PROBLEM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-gray-700"
            >
              Tell us what happened
            </a>{" "}
            — it helps, and it is optional. {OPENS_GOOGLE_FORMS}
          </p>
        </div>
      </div>
    );
  }
}
