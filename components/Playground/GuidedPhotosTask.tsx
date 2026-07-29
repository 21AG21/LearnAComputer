"use client";

import { useState } from "react";
import Image from "next/image";
import SimulatorFrame from "./SimulatorFrame";
import { useStepRunner, type SimMode } from "./useStepRunner";
import {
  ImageIcon, HeartIcon, HeartFilledIcon, TrashIcon, FolderIcon,
  ShareIcon, MailIcon, ChatIcon, RotateIcon, CropIcon, SquareIcon,
  RectangleIcon, UndoIcon, SearchIcon,
} from "./Icons";
import { getThread, saveThread } from "@/lib/chat";
import { photoSrc } from "@/lib/photoAssets";

export type GuidedPhotosStep = {
  say: string;
  action:
    | "select-photo" | "favorite" | "unfavorite" | "delete" | "recover"
    | "create-album" | "add-to-album" | "go-to-album" | "crop" | "rotate"
    | "adjust-brightness" | "adjust-contrast" | "apply-filter" | "revert"
    | "share" | "search";
  target?: string;
  value?: string;
  via?: "mail" | "messages";
  to?: string;
};

interface GuidedPhotosTaskProps {
  goal: string;
  steps: GuidedPhotosStep[];
  mode?: SimMode;
  hint?: string;
  freePlay?: boolean;
  onResult: (success: boolean, failMessage?: string) => void;
}

interface Photo {
  id: string;
  label: string;
  src: string;
  favorite: boolean;
  albums: string[];
  deleted: boolean;
  initialEdits?: { brightness?: number; contrast?: number; rotation?: number };
}

/**
 * The library. Four labels are load-bearing — Unit 7 lessons open "Beach Vacation",
 * "Bird in Garden", "Dog at the Park" and "Orange Cat" by name, and search for
 * "beach", "bird" and "dog" — so those stay however the art changes.
 */
const INITIAL_PHOTOS: Photo[] = [
  { id: "vacation",  label: "Beach Vacation",   src: photoSrc("tropical-beach"),  favorite: false, albums: [], deleted: false },
  { id: "dog",       label: "Dog at the Park",  src: photoSrc("dog-field"),       favorite: false, albums: [], deleted: false },
  { id: "bird",      label: "Bird in Garden",   src: photoSrc("bird-branch"),     favorite: false, albums: [], deleted: false, initialEdits: { brightness: 55, contrast: 80, rotation: 270 } },
  { id: "orange-cat",label: "Orange Cat",       src: photoSrc("cat-sleeping"),    favorite: false, albums: [], deleted: false },
  { id: "sunset",    label: "Sunset at the Beach", src: photoSrc("sunset-beach"), favorite: false, albums: [], deleted: false },
  { id: "mountains", label: "Mountains at Dawn", src: photoSrc("mountain-dawn"),  favorite: false, albums: [], deleted: false },
  { id: "lake",      label: "Still Lake",       src: photoSrc("lake-mirror"),     favorite: false, albums: [], deleted: false },
  { id: "forest",    label: "Path Through the Woods", src: photoSrc("forest-path"), favorite: false, albums: [], deleted: false },
  { id: "autumn",    label: "Autumn Woods",     src: photoSrc("autumn-woods"),    favorite: false, albums: [], deleted: false },
  { id: "meadow",    label: "Wildflower Meadow", src: photoSrc("wildflower-meadow"), favorite: false, albums: [], deleted: false },
  { id: "stars",     label: "Starry Night",     src: photoSrc("starry-night"),    favorite: false, albums: [], deleted: false },
  { id: "moon",      label: "Full Moon",        src: photoSrc("full-moon"),       favorite: false, albums: [], deleted: false },
  { id: "city",      label: "City at Dusk",     src: photoSrc("city-dusk"),       favorite: false, albums: [], deleted: false },
  { id: "bridge",    label: "Bridge at Night",  src: photoSrc("bridge-night"),    favorite: false, albums: [], deleted: false },
  { id: "harbour",   label: "Boats in the Harbour", src: photoSrc("harbour"),     favorite: false, albums: [], deleted: false },
  { id: "flower",    label: "Sunflower",        src: photoSrc("single-flower"),   favorite: false, albums: [], deleted: false },
  { id: "leaf",      label: "A Single Leaf",    src: photoSrc("autumn-leaf"),     favorite: false, albums: [], deleted: false },
  { id: "coffee",    label: "Morning Coffee",   src: photoSrc("coffee-cup"),      favorite: false, albums: [], deleted: false },
  { id: "breakfast", label: "Breakfast",        src: photoSrc("breakfast-table"), favorite: false, albums: [], deleted: false },
  { id: "plant",     label: "Plant on the Windowsill", src: photoSrc("windowsill-plant"), favorite: false, albums: [], deleted: false },
  { id: "books",     label: "Bookshelf",        src: photoSrc("bookshelf"),       favorite: false, albums: [], deleted: false },
  { id: "butterfly", label: "Butterfly",        src: photoSrc("butterfly"),       favorite: false, albums: [], deleted: false },
  { id: "koi",       label: "Koi Pond",         src: photoSrc("fish"),            favorite: false, albums: [], deleted: false },
  { id: "rainbow",   label: "Rainbow After Rain", src: photoSrc("rainbow"),       favorite: false, albums: [], deleted: false },
];

const FILTERS = ["Vivid", "Dramatic", "B&W", "Warm", "Cool"];
const CROP_PRESETS = ["Original", "Square", "Wide"] as const;
type CropPreset = (typeof CROP_PRESETS)[number];

const CONTACTS = [
  { id: "alex", name: "Alex", avatar: "/site/avatar-alex.webp" },
  { id: "jordan", name: "Jordan", avatar: "/site/avatar-jordan.webp" },
  { id: "sam", name: "Sam", avatar: "/site/avatar-sam.webp" },
  { id: "grandma", name: "Grandma", avatar: "/site/avatar-grandma.webp" },
];

export default function GuidedPhotosTask({ goal, steps, mode, hint, freePlay, onResult }: GuidedPhotosTaskProps) {
  const [photos, setPhotos] = useState<Photo[]>(INITIAL_PHOTOS);
  const [albums, setAlbums] = useState<string[]>(["Vacation", "Family", "Pets"]);
  const [section, setSection] = useState("All Photos");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [cropPreset, setCropPreset] = useState<CropPreset>("Original");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [sharePhase, setSharePhase] = useState<null | "channel" | "contact">(null);
  const [shareVia, setShareVia] = useState<"mail" | "messages" | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [albumPickerShown, setAlbumPickerShown] = useState(false);
  const [newAlbumInput, setNewAlbumInput] = useState("");
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sharedToContact, setSharedToContact] = useState<string | null>(null);
  const [showMeBanner, setShowMeBanner] = useState(false);
  const [showMeConfirmed, setShowMeConfirmed] = useState(false);

  const { step, stepIndex, finished, done, flash, tryStep, wants, objectives, completed } =
    useStepRunner({ steps, mode, onResult });

  function hl(kind: string, name?: string): boolean {
    if (finished || !step) return false;
    switch (step.action) {
      case "select-photo":
        // The photo view replaces the grid, so while a different photo is open
        // the wanted tile is not on screen. Glowing an invisible tile stranded
        // learners on "Click Back, then open X" — the glow belongs on Back.
        if (selectedPhoto && selectedPhoto.label !== step.target) return kind === "back-btn";
        return kind === "photo" && name === step.target;
      case "favorite": return kind === "fav-btn";
      case "unfavorite": return kind === "fav-btn";
      case "delete": return kind === "delete-btn";
      case "recover": return kind === "recover-btn" && name === step.target;
      case "create-album": return creatingAlbum ? kind === "new-album-confirm" : kind === "new-album-btn";
      case "add-to-album": return albumPickerShown ? (kind === "album-choice" && name === step.value) : kind === "add-album-btn";
      case "go-to-album": return kind === "sidebar-item" && name === step.target;
      case "crop": return kind === "crop-preset" && name !== "Original";
      case "rotate": return kind === "rotate-btn";
      case "adjust-brightness": return kind === "brightness-slider";
      case "adjust-contrast": return kind === "contrast-slider";
      case "apply-filter": return kind === "filter-btn" && name === step.value;
      case "revert": return kind === "revert-btn";
      case "share":
        if (sharePhase === "contact") return kind === "share-contact" && name === step.to;
        if (sharePhase === "channel") return kind === "share-channel" && name === step.via;
        return kind === "share-btn";
      case "search": return searchOpen ? kind === "search-input" : kind === "search-icon";
      default: return false;
    }
  }

  const pulse = "ring-4 ring-yellow-400 animate-pulse";

  function resetEdits(photo?: Photo | null) {
    setFilter(null);
    setRotation(photo?.initialEdits?.rotation ?? 0);
    setCropPreset("Original");
    setBrightness(photo?.initialEdits?.brightness ?? 100);
    setContrast(photo?.initialEdits?.contrast ?? 100);
  }

  function getVisiblePhotos(): Photo[] {
    const active = photos.filter((p) => !p.deleted);
    if (section === "All Photos") return searchQuery ? active.filter((p) => p.label.toLowerCase().includes(searchQuery.toLowerCase())) : active;
    if (section === "Favorites") return active.filter((p) => p.favorite);
    if (section === "Recently Deleted") return photos.filter((p) => p.deleted);
    return active.filter((p) => p.albums.includes(section));
  }

  function handleSelectPhoto(photo: Photo) {
    setSelectedPhoto(photo);
    resetEdits(photo);
    setSharePhase(null);
    setShareVia(null);
    setShareToast(null);
    setAlbumPickerShown(false);
    setSearchOpen(false);
    setSearchQuery("");
    tryStep((s) => s.action === "select-photo" && s.target === photo.label);
  }

  function handleFavorite() {
    if (!selectedPhoto) return;
    const newVal = !selectedPhoto.favorite;
    setPhotos((prev) => prev.map((p) => p.id === selectedPhoto.id ? { ...p, favorite: newVal } : p));
    setSelectedPhoto((p) => p ? { ...p, favorite: newVal } : p);
    // Both the photo and the direction have to match. This used to accept `favorite` or
    // `unfavorite` on any photo at all, so "Favorite the beach photo" was satisfied by
    // favoriting the cat — and "un-favorite it" by favoriting it again.
    tryStep((s) =>
      s.action === (newVal ? "favorite" : "unfavorite") &&
      (!s.target || s.target === selectedPhoto.label));
  }

  function handleDelete() {
    if (!selectedPhoto) return;
    const label = selectedPhoto.label;
    setPhotos((prev) => prev.map((p) => p.id === selectedPhoto.id ? { ...p, deleted: true } : p));
    setSelectedPhoto(null);
    tryStep((s) => s.action === "delete" && (!s.target || s.target === label));
  }

  function handleRecover(photo: Photo) {
    setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, deleted: false } : p));
    tryStep((s) => s.action === "recover" && s.target === photo.label);
  }

  function handleGoToAlbum(name: string) {
    setSection(name);
    setSelectedPhoto(null);
    setSearchQuery("");
    setSearchOpen(false);
    tryStep((s) => s.action === "go-to-album" && s.target === name);
  }

  function handleCreateAlbum() {
    setCreatingAlbum(true);
  }

  function handleConfirmAlbum() {
    const name = (newAlbumInput || step?.value || "New Album").trim();
    if (!albums.includes(name)) setAlbums((prev) => [...prev, name]);
    setNewAlbumInput("");
    setCreatingAlbum(false);
    tryStep((s) => s.action === "create-album" && (!s.value || s.value.toLowerCase() === name.toLowerCase()));
  }

  function handleAddToAlbum() {
    setAlbumPickerShown(true);
  }

  function handlePickAlbum(albumName: string) {
    if (!selectedPhoto) return;
    setPhotos((prev) => prev.map((p) => p.id === selectedPhoto.id && !p.albums.includes(albumName) ? { ...p, albums: [...p.albums, albumName] } : p));
    setAlbumPickerShown(false);
    tryStep((s) => s.action === "add-to-album" && s.value === albumName);
  }

  function handleCropPreset(preset: CropPreset) {
    setCropPreset(preset);
    tryStep((s) => s.action === "crop" && preset !== "Original");
  }

  function handleRotate() {
    setRotation((r) => (r + 90) % 360);
    tryStep((s) => s.action === "rotate");
  }

  /** A step's `value` is a "min-max" range the slider must land inside; absent means anywhere. */
  function inRange(value: string | undefined, val: number): boolean {
    const min = value ? Number(value.split("-")[0]) : 0;
    const max = value ? Number(value.split("-")[1]) : 200;
    return val >= min && val <= max;
  }

  function handleBrightnessChange(val: number) {
    setBrightness(val);
    tryStep((s) => s.action === "adjust-brightness" && inRange(s.value, val));
  }

  function handleContrastChange(val: number) {
    setContrast(val);
    tryStep((s) => s.action === "adjust-contrast" && inRange(s.value, val));
  }

  function handleApplyFilter(name: string) {
    setFilter(name);
    tryStep((s) => s.action === "apply-filter" && s.value === name);
  }

  function handleRevert() {
    resetEdits(selectedPhoto);
    tryStep((s) => s.action === "revert");
  }

  function handleShareClick() {
    setSharePhase("channel");
    tryStep((s) => s.action === "share" && !s.via);
  }

  function handleShareChannel(via: "mail" | "messages") {
    setShareVia(via);
    setSharePhase("contact");
    tryStep((s) => s.action === "share" && s.via === via && !s.to);
  }

  function handleShareContact(contactId: string) {
    const contact = CONTACTS.find((c) => c.id === contactId);
    const label = via === "messages" ? "Messages" : "Mail";
    setSharePhase(null);
    setSharedToContact(contactId);
    setShareToast(`Sent to ${contact?.name ?? contactId} via ${label}`);
    setTimeout(() => setShareToast(null), 3000);
    const wasLast = completed.size + 1 >= steps.length;
    tryStep((s) => s.action === "share" && s.to === contactId);
    if (wasLast && via === "messages" && wants((s) => s.action === "share" && s.to === contactId)) {
      setShowMeBanner(true);
    }
  }

  function handleShowMe() {
    if (!sharedToContact || !selectedPhoto) return;
    const existing = getThread(sharedToContact) ?? [];
    saveThread(sharedToContact, [...existing, { from: "me", text: `Shared a photo with you: ${selectedPhoto.label}` }]);
    setShowMeConfirmed(true);
  }

  const via = shareVia;

  const SIDEBAR_SECTIONS = ["All Photos", "Favorites", "Recently Deleted", ...albums];

  const photoStyle = {
    transform: rotation ? `rotate(${rotation}deg)` : "none",
    filter: [
      `brightness(${brightness / 100})`,
      `contrast(${contrast / 100})`,
      filter === "B&W" ? "grayscale(1)" : "",
      filter === "Vivid" ? "saturate(2)" : "",
      filter === "Dramatic" ? "contrast(1.5)" : "",
      filter === "Warm" ? "sepia(0.4)" : "",
      filter === "Cool" ? "hue-rotate(180deg) saturate(0.7)" : "",
    ].filter(Boolean).join(" "),
  };

  const cropAspect = cropPreset === "Square" ? "aspect-square" : cropPreset === "Wide" ? "aspect-video" : "aspect-[4/3]";

  return (
    <SimulatorFrame
      appName="Photos"
      appIcon={<ImageIcon size={20} />}
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
      objectives={objectives}
      hint={hint}
      freePlay={freePlay}
    >
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-36 bg-gray-50 border-r flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-2 border-b flex items-center gap-1">
            {searchOpen ? (
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedPhoto(null);
                  setSection("All Photos");
                  const q = e.target.value.toLowerCase();
                  tryStep((s) => s.action === "search" && !!s.value && q.includes(s.value.toLowerCase()));
                }}
                placeholder="Search..."
                className={`flex-1 px-2 py-1.5 text-xs border rounded outline-none focus:border-blue-400 ${hl("search-input") ? pulse : ""}`}
              />
            ) : (
              <button
                onClick={() => {
                  setSearchOpen(true);
                  tryStep((s) => s.action === "search" && !s.value);
                }}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 border rounded w-full hover:bg-gray-100 ${hl("search-icon") ? pulse : ""}`}
              >
                <SearchIcon size={12} /> Search
              </button>
            )}
          </div>
          {SIDEBAR_SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleGoToAlbum(s)}
              className={`px-3 py-2 text-left text-xs border-b transition-all hover:bg-gray-100 ${
                section === s ? "bg-blue-100 font-medium text-blue-700" : "text-gray-700"
              } ${hl("sidebar-item", s) ? pulse : ""}`}
            >
              <span className="inline-flex items-center gap-1.5">{s === "All Photos" ? <ImageIcon size={14} /> : s === "Favorites" ? <HeartFilledIcon size={14} className="text-red-500" /> : s === "Recently Deleted" ? <TrashIcon size={14} /> : <FolderIcon size={14} />} {s}</span>
            </button>
          ))}
          {creatingAlbum ? (
            <div className="p-2 border-b">
              <input
                autoFocus
                value={newAlbumInput}
                onChange={(e) => setNewAlbumInput(e.target.value)}
                placeholder={step?.value || "Album name"}
                className="w-full px-2 py-1 text-xs border rounded outline-none mb-1"
                onKeyDown={(e) => e.key === "Enter" && handleConfirmAlbum()}
              />
              <button
                onClick={handleConfirmAlbum}
                className={`w-full py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 ${hl("new-album-confirm") ? pulse : ""}`}
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={handleCreateAlbum}
              className={`px-3 py-2 text-left text-xs text-blue-600 border-b hover:bg-gray-100 ${hl("new-album-btn") ? pulse : ""}`}
            >
              + New Album
            </button>
          )}
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedPhoto ? (
            <div className="flex-1 overflow-y-auto">
              {/* Toolbar */}
              <div className="p-3 border-b flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => { setSelectedPhoto(null); resetEdits(); }}
                  className={`text-gray-400 hover:text-gray-600 mr-1 rounded px-1 ${hl("back-btn") ? pulse : ""}`}
                >
                  ← Back
                </button>
                <button onClick={handleFavorite} className={`px-2 py-1 text-xs rounded border transition-all inline-flex items-center gap-1 ${selectedPhoto.favorite ? "bg-red-50 text-red-500 border-red-200" : "border-gray-200 hover:bg-gray-50"} ${hl("fav-btn") ? pulse : ""}`}>
                  {selectedPhoto.favorite ? <HeartFilledIcon size={12} /> : <HeartIcon size={12} />} Fav
                </button>
                <button onClick={handleShareClick} className={`px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1 ${hl("share-btn") ? pulse : ""}`}><ShareIcon size={12} /> Share</button>
                <button onClick={handleAddToAlbum} className={`px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1 ${hl("add-album-btn") ? pulse : ""}`}><FolderIcon size={12} /> Album</button>
                {section !== "Recently Deleted" && (
                  <button onClick={handleDelete} className={`px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1 ${hl("delete-btn") ? pulse : ""}`}><TrashIcon size={12} /> Delete</button>
                )}
              </div>

              {albumPickerShown && (
                <div className="mx-4 mt-2 p-3 bg-white border rounded-lg shadow-lg z-30 relative">
                  <p className="text-xs font-medium text-gray-500 mb-2">Add to album:</p>
                  {albums.map((a) => (
                    <button key={a} onClick={() => handlePickAlbum(a)} className={`block w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 rounded ${hl("album-choice", a) ? pulse : ""}`}><span className="inline-flex items-center gap-1"><FolderIcon size={12} /> {a}</span></button>
                  ))}
                </div>
              )}

              {/* Share sheet */}
              {sharePhase === "channel" && (
                <div className="mx-4 mt-2 p-3 bg-gray-50 border rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-2">Share via:</p>
                  <div className="flex gap-3">
                    <button onClick={() => handleShareChannel("mail")} className={`flex items-center gap-1.5 text-xs bg-white border rounded px-3 py-2 hover:bg-gray-50 ${hl("share-channel", "mail") ? pulse : ""}`}>
                      <MailIcon size={16} /> Mail
                    </button>
                    <button onClick={() => handleShareChannel("messages")} className={`flex items-center gap-1.5 text-xs bg-white border rounded px-3 py-2 hover:bg-gray-50 ${hl("share-channel", "messages") ? pulse : ""}`}>
                      <ChatIcon size={16} /> Messages
                    </button>
                  </div>
                </div>
              )}
              {sharePhase === "contact" && (
                <div className="mx-4 mt-2 p-3 bg-gray-50 border rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-2">Send to:</p>
                  <div className="flex gap-2 flex-wrap">
                    {CONTACTS.map((c) => (
                      <button key={c.id} onClick={() => handleShareContact(c.id)} className={`flex items-center gap-1.5 text-xs bg-white border rounded px-3 py-2 hover:bg-gray-50 ${hl("share-contact", c.id) ? pulse : ""}`}>
                        <div className="w-5 h-5 rounded-full overflow-hidden relative flex-shrink-0">
                          <Image src={c.avatar} alt={c.name} fill sizes="20px" className="object-cover" />
                        </div>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {shareToast && (
                <div className="mx-4 mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">
                  {shareToast}
                </div>
              )}
              {showMeBanner && (
                <div className="mx-4 mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                  <span className="flex-1">{showMeConfirmed ? "Photo sent! Open Messages from the dock to see it." : "Want to see it arrive? Send the photo to Messages."}</span>
                  {!showMeConfirmed && (
                    <button
                      onClick={handleShowMe}
                      className="shrink-0 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                    >
                      Show me
                    </button>
                  )}
                </div>
              )}

              {/* Photo display */}
              <div className="flex items-center justify-center py-4 px-4">
                <div
                  className={`${cropAspect} w-48 rounded-xl overflow-hidden relative`}
                  style={photoStyle}
                >
                  <Image src={selectedPhoto.src} alt={selectedPhoto.label} fill sizes="200px" className="object-cover" />
                </div>
              </div>
              <p className="text-center text-sm font-medium text-gray-700 mb-2">{selectedPhoto.label}</p>

              {/* Edit controls */}
              <div className="px-4 pb-4 flex flex-col gap-3">
                <div className="flex gap-2 flex-wrap">
                  {CROP_PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleCropPreset(p)}
                      className={`px-2 py-1 text-xs rounded border transition-all ${cropPreset === p ? "bg-blue-500 text-white border-blue-500" : "border-gray-200 hover:bg-gray-50"} ${hl("crop-preset", p) ? pulse : ""}`}
                    >
                      <span className="inline-flex items-center gap-1">{p === "Original" ? <CropIcon size={12} /> : p === "Square" ? <SquareIcon size={12} /> : <RectangleIcon size={12} />} {p}</span>
                    </button>
                  ))}
                  <button onClick={handleRotate} className={`px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 transition-all inline-flex items-center gap-1 ${hl("rotate-btn") ? pulse : ""}`}><RotateIcon size={12} /> Rotate</button>
                  <button onClick={handleRevert} className={`px-2 py-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 rounded transition-all inline-flex items-center gap-1 ${hl("revert-btn") ? pulse : ""}`}><UndoIcon size={12} /> Revert</button>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Brightness ({brightness}%)</label>
                  <input
                    type="range" min={20} max={200} value={brightness}
                    onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                    className={`w-full ${hl("brightness-slider") ? pulse : ""}`}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Contrast ({contrast}%)</label>
                  <input
                    type="range" min={20} max={200} value={contrast}
                    onChange={(e) => handleContrastChange(Number(e.target.value))}
                    className={`w-full ${hl("contrast-slider") ? pulse : ""}`}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => handleApplyFilter(f)}
                      className={`px-2 py-1 text-xs rounded border transition-all ${filter === f ? "bg-blue-500 text-white border-blue-500" : "border-gray-200 hover:bg-gray-50"} ${hl("filter-btn", f) ? pulse : ""}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : section === "Recently Deleted" ? (
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-500">Photos are deleted permanently after 30 days.</div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {photos.filter((p) => p.deleted).map((photo) => (
                  <div key={photo.id} className="flex flex-col items-center gap-1">
                    <div className="w-full aspect-square rounded-lg overflow-hidden relative opacity-60">
                      <Image src={photo.src} alt={photo.label} fill sizes="120px" className="object-cover" />
                    </div>
                    <p className="text-xs text-gray-500 text-center truncate w-full">{photo.label}</p>
                    <button
                      onClick={() => handleRecover(photo)}
                      className={`text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 ${hl("recover-btn", photo.label) ? pulse : ""}`}
                    >
                      Recover
                    </button>
                  </div>
                ))}
                {photos.filter((p) => p.deleted).length === 0 && (
                  <div className="col-span-3 flex items-center justify-center h-24 text-gray-400 text-sm">Empty</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-3 gap-2">
                {getVisiblePhotos().map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handleSelectPhoto(photo)}
                    className={`relative aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-all ${hl("photo", photo.label) ? pulse : ""}`}
                  >
                    <Image src={photo.src} alt={photo.label} fill sizes="120px" className="object-cover" />
                    {photo.favorite && <span className="absolute top-1 right-1 text-red-500 drop-shadow"><HeartFilledIcon size={14} /></span>}
                  </button>
                ))}
                {getVisiblePhotos().length === 0 && (
                  <div className="col-span-3 flex items-center justify-center h-24 text-gray-400 text-sm">No photos</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </SimulatorFrame>
  );
}
