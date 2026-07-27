import { type ReactNode } from "react";
import { photoSrc } from "@/lib/photoAssets";
import {
  HomeIcon, FolderIcon, TrashIcon,
  ImageIcon, FileDocIcon, NoteIcon, SpreadsheetIcon, BookClosedIcon, MusicIcon,
  DownloadIcon,
} from "../Icons";

// ── Shared types ────────────────────────────────────────────────────────────

export type Loc = "home" | "documents" | "pictures" | "downloads" | "trash";

export interface Item {
  id: string;
  name: string;
  kind: "file" | "folder";
  loc: Loc;
  ext?: string;
  body?: string;
}

export const LOC_TITLE: Record<Loc, string> = {
  home: "Home",
  documents: "Documents",
  pictures: "Pictures",
  downloads: "Downloads",
  trash: "Trash",
};

export const SIDEBAR: { id: Loc; label: string; icon: ReactNode }[] = [
  { id: "home",      label: "Home",      icon: <HomeIcon size={16} /> },
  { id: "documents", label: "Documents", icon: <FolderIcon size={16} /> },
  { id: "pictures",  label: "Pictures",  icon: <ImageIcon size={16} /> },
  { id: "downloads", label: "Downloads", icon: <DownloadIcon size={16} /> },
  { id: "trash",     label: "Trash",     icon: <TrashIcon size={16} /> },
];

export function makeItems(): Item[] {
  return [
    { id: "documents", name: "Documents", kind: "folder", loc: "home" },
    { id: "pictures",  name: "Pictures",  kind: "folder", loc: "home" },
    { id: "downloads", name: "Downloads", kind: "folder", loc: "home" },
    { id: "budget",    name: "Budget.xlsx",               kind: "file", loc: "home",      ext: "xlsx", body: "Rent\t1200\nGroceries\t340\nUtilities\t85\nEntertainment\t75" },
    { id: "grocery",   name: "GroceryList.txt",           kind: "file", loc: "home",      ext: "txt",  body: "Milk\nEggs\nBread\nApples" },
    { id: "vacation",  name: "VacationPhoto.png",         kind: "file", loc: "home",      ext: "png" },
    { id: "song",      name: "FavoriteSong.mp3",          kind: "file", loc: "home",      ext: "mp3" },
    { id: "taxreturn", name: "TaxReturn.pdf",             kind: "file", loc: "home",      ext: "pdf" },
    { id: "invitation", name: "BirthdayInvitation.txt",    kind: "file", loc: "documents", ext: "txt",  body: "You're invited!\n\nSaturday the 14th, 2 o'clock\n42 Maple Street\n\nCake will be provided.\nPlease let me know if you can make it." },
    { id: "resume",    name: "Resume.pdf",                kind: "file", loc: "documents", ext: "pdf" },
    { id: "letter",    name: "Letter.docx",               kind: "file", loc: "documents", ext: "docx", body: "Dear Sir or Madam,\n\nThank you for the replacement kettle. It arrived on Tuesday and works beautifully.\n\nYours sincerely,\nDr. Digital" },
    { id: "sunset",    name: "Sunset.png",                kind: "file", loc: "pictures",  ext: "png" },
    { id: "messy",     name: "img_20250104_FINAL(2).jpg", kind: "file", loc: "downloads", ext: "jpg" },
  ];
}

export function iconFor(item: Item, sz = 40): ReactNode {
  if (item.kind === "folder") return <FolderIcon size={sz} />;
  switch (item.ext) {
    case "png":
    case "jpg":  return <ImageIcon size={sz} />;
    case "txt":  return <FileDocIcon size={sz} />;
    case "docx": return <NoteIcon size={sz} />;
    case "xlsx": return <SpreadsheetIcon size={sz} />;
    case "pdf":  return <BookClosedIcon size={sz} />;
    case "mp3":  return <MusicIcon size={sz} />;
    default:     return <FileDocIcon size={sz} />;
  }
}

// ── Legacy exports (keep for EditFileTask backward compat) ───────────────────

export interface FileEntry {
  name: string;
  image?: string;
  icon?: "music";
  contents?: string;
}

export const ATTACHABLE_FILES: FileEntry[] = [
  { name: "VacationPhoto.png", image: photoSrc("tropical-beach") },
  { name: "GroceryList.txt",   contents: "Milk\nEggs\nBread\nApples" },
  { name: "Budget.xlsx",       image: "/playgrounds/Budget.png" },
  { name: "SecretRecipie.docx", contents: "Grandma's secret cookies:\nbutter, sugar, flour, love." },
  { name: "FavoriteSong.mp3",  icon: "music" },
  { name: "Sunset.png",        image: photoSrc("sunset-beach") },
];
