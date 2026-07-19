"use client";

import { useState } from "react";

export type GuidedPhotosStep = {
  say: string;
  action:
    | "select-photo" | "favorite" | "unfavorite" | "delete" | "recover"
    | "create-album" | "add-to-album" | "go-to-album" | "crop" | "rotate"
    | "adjust-brightness" | "apply-filter" | "revert" | "share" | "search";
  target?: string;
  value?: string;
};

interface GuidedPhotosTaskProps {
  goal: string;
  steps: GuidedPhotosStep[];
  onResult: (success: boolean) => void;
}

interface Photo {
  id: string;
  label: string;
  emoji: string;
  color: string;
  favorite: boolean;
  albums: string[];
  deleted: boolean;
}

const INITIAL_PHOTOS: Photo[] = [
  { id: "beach-sunset", label: "Beach Sunset", emoji: "🌅", color: "#FED7AA", favorite: false, albums: [], deleted: false },
  { id: "family-dinner", label: "Family Dinner", emoji: "👨‍👩‍👧", color: "#FCA5A5", favorite: false, albums: [], deleted: false },
  { id: "dog-park", label: "Dog in Park", emoji: "🐕", color: "#86EFAC", favorite: false, albums: [], deleted: false },
  { id: "birthday", label: "Birthday Cake", emoji: "🎂", color: "#F9A8D4", favorite: false, albums: [], deleted: false },
  { id: "mountain", label: "Mountain Hike", emoji: "🏔️", color: "#93C5FD", favorite: false, albums: [], deleted: false },
  { id: "flowers", label: "Garden Flowers", emoji: "🌺", color: "#D8B4FE", favorite: false, albums: [], deleted: false },
  { id: "cat", label: "Cat Sleeping", emoji: "🐱", color: "#D1D5DB", favorite: false, albums: [], deleted: false },
  { id: "holiday", label: "Holiday Tree", emoji: "🎄", color: "#6EE7B7", favorite: false, albums: [], deleted: false },
  { id: "selfie", label: "Selfie", emoji: "📸", color: "#FDE68A", favorite: false, albums: [], deleted: false },
  { id: "pizza", label: "Pizza Night", emoji: "🍕", color: "#FCA5A5", favorite: false, albums: [], deleted: false },
  { id: "roadtrip", label: "Road Trip", emoji: "🚗", color: "#99F6E4", favorite: false, albums: [], deleted: false },
  { id: "beach-day", label: "Beach Day", emoji: "⛱️", color: "#BAE6FD", favorite: false, albums: [], deleted: false },
];

const FILTERS = ["Vivid", "Dramatic", "B&W", "Warm", "Cool"];

export default function GuidedPhotosTask({ goal, steps, onResult }: GuidedPhotosTaskProps) {
  const [photos, setPhotos] = useState<Photo[]>(INITIAL_PHOTOS);
  const [albums, setAlbums] = useState<string[]>(["Vacation", "Family", "Pets"]);
  const [section, setSection] = useState("All Photos");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [rotated, setRotated] = useState(false);
  const [cropped, setCropped] = useState(false);
  const [brightness, setBrightness] = useState(50);
  const [shareShown, setShareShown] = useState(false);
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
      case "crop": return kind === "crop-btn";
      case "rotate": return kind === "rotate-btn";
      case "adjust-brightness": return kind === "brightness-slider";
      case "apply-filter": return kind === "filter-btn" && name === step.value;
      case "revert": return kind === "revert-btn";
      case "share": return kind === "share-btn";
      case "search": return kind === "search-input";
      default: return false;
    }
  }

  const pulse = "ring-4 ring-yellow-400 animate-pulse";

  function getVisiblePhotos(): Photo[] {
    const active = photos.filter((p) => !p.deleted);
    if (section === "All Photos") return searchQuery ? active.filter((p) => p.label.toLowerCase().includes(searchQuery.toLowerCase())) : active;
    if (section === "Favorites") return active.filter((p) => p.favorite);
    if (section === "People") return active.filter((p) => p.emoji === "👨‍👩‍👧" || p.emoji === "📸");
    if (section === "Recently Deleted") return photos.filter((p) => p.deleted);
    return active.filter((p) => p.albums.includes(section));
  }

  function handleSelectPhoto(photo: Photo) {
    setSelectedPhoto(photo);
    setFilter(null);
    setRotated(false);
    setCropped(false);
    setBrightness(50);
    setShareShown(false);
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
    if (step?.action === "create-album" && !creatingAlbum) {
      // just opening the input; don't complete yet
    }
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

  function handleCrop() {
    setCropped(true);
    if (step?.action === "crop") completeStep();
  }

  function handleRotate() {
    setRotated((r) => !r);
    if (step?.action === "rotate") completeStep();
  }

  function handleBrightnessChange(val: number) {
    setBrightness(val);
    if (step?.action === "adjust-brightness") completeStep();
  }

  function handleApplyFilter(name: string) {
    setFilter(name);
    if (step?.action === "apply-filter" && step.value === name) completeStep();
  }

  function handleRevert() {
    setFilter(null);
    setRotated(false);
    setCropped(false);
    setBrightness(50);
    if (step?.action === "revert") completeStep();
  }

  function handleShare() {
    setShareShown(true);
    if (step?.action === "share") completeStep();
  }

  const SIDEBAR_SECTIONS = ["All Photos", "Favorites", "People", "Recently Deleted", ...albums];

  return (
    <div className="h-full flex flex-col bg-white relative">
      {!finished && step && (
        <div className="bg-gray-900 text-white px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs text-gray-400">Step {stepIndex + 1} of {steps.length}</span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(stepIndex / steps.length) * 100}%` }} />
            </div>
          </div>
          <p className="text-sm text-gray-200">{step.say}</p>
        </div>
      )}

      {done && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/95">
          <p className="text-5xl mb-3">✅</p>
          <p className="text-xl font-bold text-green-700 text-center px-4">DONE — {goal}</p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-36 bg-gray-50 border-r flex flex-col flex-shrink-0 overflow-y-auto">
          {/* Search */}
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
          {/* Sections */}
          {SIDEBAR_SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleGoToAlbum(s)}
              className={`px-3 py-2 text-left text-xs border-b transition-all hover:bg-gray-100 ${
                section === s ? "bg-blue-100 font-medium text-blue-700" : "text-gray-700"
              } ${hl("sidebar-item", s) ? pulse : ""}`}
            >
              {s === "All Photos" ? "🖼️" : s === "Favorites" ? "❤️" : s === "People" ? "👤" : s === "Recently Deleted" ? "🗑️" : "📁"} {s}
            </button>
          ))}
          {/* New album */}
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
            /* Photo viewer */
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b flex items-center gap-2 flex-wrap">
                <button onClick={() => setSelectedPhoto(null)} className="text-gray-400 hover:text-gray-600 mr-1">← Back</button>
                <button onClick={handleFavorite} className={`px-2 py-1 text-xs rounded border transition-all ${selectedPhoto.favorite ? "bg-red-50 text-red-500 border-red-200" : "border-gray-200 hover:bg-gray-50"} ${hl("fav-btn") ? pulse : ""}`}>
                  {selectedPhoto.favorite ? "❤️" : "🤍"} Fav
                </button>
                <button onClick={handleShare} className={`px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 ${hl("share-btn") ? pulse : ""}`}>📤 Share</button>
                <button onClick={handleAddToAlbum} className={`px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 ${hl("add-album-btn") ? pulse : ""}`}>📁 Album</button>
                {section !== "Recently Deleted" && (
                  <button onClick={handleDelete} className={`px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 ${hl("delete-btn") ? pulse : ""}`}>🗑 Delete</button>
                )}
              </div>

              {/* Album picker */}
              {albumPickerShown && (
                <div className="absolute top-20 left-40 z-30 bg-white border rounded-lg shadow-xl p-3 min-w-[150px]">
                  <p className="text-xs font-medium text-gray-500 mb-2">Add to album:</p>
                  {albums.map((a) => (
                    <button key={a} onClick={() => handlePickAlbum(a)} className={`block w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 rounded ${hl("album-choice", a) ? pulse : ""}`}>📁 {a}</button>
                  ))}
                </div>
              )}

              {/* Share sheet */}
              {shareShown && (
                <div className="mx-4 mt-2 p-3 bg-gray-50 border rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-2">Share via:</p>
                  <div className="flex gap-3">
                    {["💬 Message", "📧 Email", "📋 Copy"].map((opt) => (
                      <button key={opt} onClick={() => setShareShown(false)} className="text-xs bg-white border rounded px-2 py-1.5 hover:bg-gray-50">{opt}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo display */}
              <div className="flex items-center justify-center py-4 px-4">
                <div
                  className="w-48 h-48 rounded-xl flex items-center justify-center text-6xl transition-all"
                  style={{
                    backgroundColor: selectedPhoto.color,
                    transform: rotated ? "rotate(90deg)" : "none",
                    filter: filter === "B&W" ? "grayscale(1)" : filter === "Vivid" ? "saturate(2)" : filter === "Dramatic" ? "contrast(1.5)" : filter === "Warm" ? "sepia(0.4)" : filter === "Cool" ? "hue-rotate(180deg) saturate(0.7)" : `brightness(${0.5 + brightness / 100})`,
                    clipPath: cropped ? "inset(10%)" : "none",
                  }}
                >
                  {selectedPhoto.emoji}
                </div>
              </div>
              <p className="text-center text-sm font-medium text-gray-700 mb-2">{selectedPhoto.label}</p>

              {/* Edit controls */}
              <div className="px-4 pb-4 flex flex-col gap-3">
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleCrop} className={`px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-all ${hl("crop-btn") ? pulse : ""}`}>✂️ Crop</button>
                  <button onClick={handleRotate} className={`px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-all ${hl("rotate-btn") ? pulse : ""}`}>🔄 Rotate</button>
                  <button onClick={handleRevert} className={`px-3 py-1.5 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 rounded transition-all ${hl("revert-btn") ? pulse : ""}`}>↺ Revert to Original</button>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Brightness</label>
                  <input
                    type="range" min={0} max={100} value={brightness}
                    onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                    className={`w-full ${hl("brightness-slider") ? pulse : ""}`}
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
            /* Recently Deleted */
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-500">Photos are deleted permanently after 30 days.</div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {photos.filter((p) => p.deleted).map((photo) => (
                  <div key={photo.id} className="flex flex-col items-center gap-1">
                    <div className="w-full aspect-square rounded-lg flex items-center justify-center text-3xl opacity-60" style={{ backgroundColor: photo.color }}>
                      {photo.emoji}
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
            /* Photo grid */
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-3 gap-2">
                {getVisiblePhotos().map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handleSelectPhoto(photo)}
                    className={`relative aspect-square rounded-lg flex items-center justify-center text-3xl hover:opacity-90 transition-all ${hl("photo", photo.label) ? pulse : ""}`}
                    style={{ backgroundColor: photo.color }}
                  >
                    {photo.emoji}
                    {photo.favorite && <span className="absolute top-1 right-1 text-xs">❤️</span>}
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

      {flash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <span className="text-green-400 text-5xl animate-ping-once">✓</span>
        </div>
      )}
    </div>
  );
}
