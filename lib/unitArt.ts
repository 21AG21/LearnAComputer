import { photoSrc } from "./photoAssets";

/**
 * Cover art per unit. Matched to the unit's subject by mood rather than by illustration —
 * a photograph of a thing, not a picture of a menu.
 */
const BY_UNIT: Record<string, string> = {
  "Unit 1: Meet Your Laptop": "desk",
  "Unit 2: Keyboard and Typing": "bookshelf",
  "Unit 3: Files and Folders": "geo-tiles",
  "Unit 4: The Internet and Browsing": "city-dusk",
  "Unit 5: Messages and Video Calls": "harbour",
  "Unit 6: Email": "misty-morning",
  "Unit 7: Photos": "single-flower",
  "Unit 8: Apps": "terrazzo",
  "Unit 9: System Settings": "concentric",
  "Unit 10: Online Safety and Security": "full-moon",
  "Unit 11: Troubleshooting": "storm-clouds",
  "Unit 12: Everyday Life with Your Computer": "breakfast-table",
  "Unit 13: Making Your Computer Easier to Use": "wave-lines",
  "Final Assessment": "mountain-dawn",
};

const FALLBACK = "gradient-mesh";

export function unitArt(unit: string): string {
  return photoSrc(BY_UNIT[unit] ?? FALLBACK);
}
