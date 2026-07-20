"use client";

import { useState } from "react";
import Image from "next/image";
import SimulatorFrame from "./SimulatorFrame";
import {
  ImageIcon, HeartIcon, HeartFilledIcon, TrashIcon, FolderIcon,
  ShareIcon, MailIcon, ChatIcon, RotateIcon, CropIcon, SquareIcon,
  RectangleIcon, UndoIcon,
} from "./Icons";

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
  onResult: (success: boolean, failMessage?: string) => void;
}

interface Photo {
  id: string;
  label: string;
  src: string;
  favorite: boolean;
  albums: string[];
  deleted: boolean;
}

const INITIAL_PHOTOS: Photo[] = [
  { id: "vacation", label: "Beach Vacation", src: "/playgrounds/VacationPhoto.png", favorite: false, albums: [], deleted: false },
  { id: "dog", label: "Dog at the Park", src: "/playgrounds/Dog.png", favorite: false, albums: [], deleted: false },
  { id: "bird", label: "Bird in Garden", src: "/playgrounds/Bird.png", favorite: false, albums: [], deleted: false },
  { id: "cow", label: "Cow on the Farm", src: "/playgrounds/Cow.png", favorite: false, albums: [], deleted: false },
  { id: "snake", label: "Snake in the Sun", src: "/playgrounds/Snake.png", favorite: false, albums: [], deleted: false },
  { id: "orange-cat", label: "Orange Cat", src: "/playgrounds/Cat1.png", favorite: false, albums: [], deleted: false },
  { id: "grumpy-cat", label: "Grumpy Cat", src: "/playgrounds/Cat2.png", favorite: false, albums: [], deleted: false },
  { id: "dog-walk", label: "Dog Walk", src: "/playgrounds/animal-dog.png", favorite: false, albums: [], deleted: false },
  { id: "bird-flight", label: "Bird in Flight", src: "/playgrounds/animal-bird.png", favorite: false, albums: [], deleted: false },
  { id: "cow-field", label: "Cow in Field", src: "/playgrounds/animal-cow.png", favorite: false, albums: [], deleted: false },
  { id: "snake-coil", label: "Coiled Snake", src: "/playgrounds/animal-snake.png", favorite: false, albums: [], deleted: false },
  { id: "budget", label: "Budget Screenshot", src: "/playgrounds/Budget.png", favorite: false, albums: [], deleted: false },
];

const FILTERS = ["Vivid", "Dramatic", "B&W", "Warm", "Cool"];
const CROP_PRESETS = ["Original", "Square", "Wide"] as const;
type CropPreset = (typeof CROP_PRESETS)[number];

const CONTACTS = [
  { id: "alex", name: "Alex", avatar: "/playgrounds/Dog.png" },
  { id: "jordan", name: "Jordan", avatar: "/playgrounds/Cat1.png" },
  { id: "sam", name: "Sam", avatar: "/playgrounds/Bird.png" },
  { id: "grandma", name: "Grandma", avatar: "/playgrounds/Cow.png" },
];

export default function GuidedPhotosTask({ goal, steps, onResult }: GuidedPhotosTaskProps) {
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
  const [stepIndex, setStepIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;

  function completeStep() {
    setFlash(true);
    setTimeout(() => setFlash(false), 850);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1500);
    }
    setStepIndex((i) => i + 1);
  }

  function hl(kind: string, name?: string): boolean {
    if (finished || !step) return false;
    switch (step.action) {
      case "select-photo": return kind === "photo" && name === step.target;
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
      case "search": return kind === "search-input";
      default: return false;
    }
  }

  const pulse = "ring-4 ring-yellow-400 animate-pulse";

  function resetEdits() {
    setFilter(null);
    setRotation(0);
    setCropPreset("Original");
    setBrightness(100);
    setContrast(100);
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
    resetEdits();
    setSharePhase(null);
    setShareVia(null);
    setShareToast(null);
    setAlbumPickerShown(false);
    if (step?.action === "select-photo" && step.target === photo.label) completeStep();
  }

  function handleFavorite() {
    if (!selectedPhoto) return;
    const newVal = !selectedPhoto.favorite;
    setPhotos((prev) => prev.map((p) => p.id === selectedPhoto.id ? { ...p, favorite: newVal } : p));
    setSelectedPhoto((p) => p ? { ...p, favorite: newVal } : p);
    if (step?.action === "favorite" || step?.action === "unfavorite") completeStep();
  }

  function handleDelete() {
    if (!selectedPhoto) return;
    setPhotos((prev) => prev.map((p) => p.id === selectedPhoto.id ? { ...p, deleted: true } : p));
    setSelectedPhoto(null);
    if (step?.action === "delete") completeStep();
  }

  function handleRecover(photo: Photo) {
    setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, deleted: false } : p));
    if (step?.action === "recover" && step.target === photo.label) completeStep();
  }

  function handleGoToAlbum(name: string) {
    setSection(name);
    setSelectedPhoto(null);
    setSearchQuery("");
    if (step?.action === "go-to-album" && step.target === name) completeStep();
  }

  function handleCreateAlbum() {
    setCreatingAlbum(true);
  }

  function handleConfirmAlbum() {
    const name = (newAlbumInput || step?.value || "New Album").trim();
    if (!albums.includes(name)) setAlbums((prev) => [...prev, name]);
    setNewAlbumInput("");
    setCreatingAlbum(false);
    if (step?.action === "create-album") completeStep();
  }

  function handleAddToAlbum() {
    setAlbumPickerShown(true);
  }

  function handlePickAlbum(albumName: string) {
    if (!selectedPhoto) return;
    setPhotos((prev) => prev.map((p) => p.id === selectedPhoto.id && !p.albums.includes(albumName) ? { ...p, albums: [...p.albums, albumName] } : p));
    setAlbumPickerShown(false);
    if (step?.action === "add-to-album" && step.value === albumName) completeStep();
  }

  function handleCropPreset(preset: CropPreset) {
    setCropPreset(preset);
    if (step?.action === "crop" && preset !== "Original") completeStep();
  }

  function handleRotate() {
    setRotation((r) => (r + 90) % 360);
    if (step?.action === "rotate") completeStep();
  }

  function handleBrightnessChange(val: number) {
    setBrightness(val);
    if (step?.action === "adjust-brightness") {
      const min = step.value ? Number(step.value.split("-")[0]) : 0;
      const max = step.value ? Number(step.value.split("-")[1]) : 200;
      if (val >= min && val <= max) completeStep();
    }
  }

  function handleContrastChange(val: number) {
    setContrast(val);
    if (step?.action === "adjust-contrast") {
      const min = step.value ? Number(step.value.split("-")[0]) : 0;
      const max = step.value ? Number(step.value.split("-")[1]) : 200;
      if (val >= min && val <= max) completeStep();
    }
  }

  function handleApplyFilter(name: string) {
    setFilter(name);
    if (step?.action === "apply-filter" && step.value === name) completeStep();
  }

  function handleRevert() {
    resetEdits();
    if (step?.action === "revert") completeStep();
  }

  function handleShareClick() {
    setSharePhase("channel");
    if (step?.action === "share" && !step.via) completeStep();
  }

  function handleShareChannel(via: "mail" | "messages") {
    setShareVia(via);
    setSharePhase("contact");
    if (step?.action === "share" && step.via === via && !step.to) completeStep();
  }

  function handleShareContact(contactId: string) {
    const contact = CONTACTS.find((c) => c.id === contactId);
    const label = via === "messages" ? "Messages" : "Mail";
    setSharePhase(null);
    setShareToast(`Sent to ${contact?.name ?? contactId} via ${label}`);
    setTimeout(() => setShareToast(null), 3000);
    if (step?.action === "share" && step.to === contactId) completeStep();
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
    >
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-36 bg-gray-50 border-r flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-2 border-b">
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedPhoto(null);
                setSection("All Photos");
                if (step?.action === "search" && e.target.value.toLowerCase().includes((step.value ?? "").toLowerCase())) completeStep();
              }}
              placeholder="Search..."
              className={`w-full px-2 py-1.5 text-xs border rounded outline-none focus:border-blue-400 ${hl("search-input") ? pulse : ""}`}
            />
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
                <button onClick={() => { setSelectedPhoto(null); resetEdits(); }} className="text-gray-400 hover:text-gray-600 mr-1">← Back</button>
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
