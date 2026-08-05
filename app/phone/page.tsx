import type { Metadata } from "next";
import PhoneCourse from "@/components/Phone/PhoneCourse";

export const metadata: Metadata = {
  title: "On Your Phone — LearnAComputer",
  description:
    "A separate hands-on course for phones and tablets: tapping, pressing and holding, swiping, pinching, and the keyboard made of glass. Practice on a phone you cannot break.",
};

export default function PhonePage() {
  return <PhoneCourse />;
}
