export interface FileEntry {
  name: string;
  image?: string;
  icon?: "music";
  contents?: string;
}

/** The standard set of filler files shown in every Files app instance across the site. */
export const FILLER_FILES: FileEntry[] = [
  { name: "VacationPhoto.png", image: "/playgrounds/VacationPhoto.png" },
  { name: "GroceryList.txt", contents: "Milk\nEggs\nBread\nApples" },
  { name: "Budget.xlsx", image: "/playgrounds/Budget.png" },
  { name: "SecretRecipie.docx", contents: "Grandma's secret cookies:\nbutter, sugar, flour, love." },
  { name: "FavoriteSong.mp3", icon: "music" },
];
