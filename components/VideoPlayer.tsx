interface VideoPlayerProps {
  videoUrl: string;
  title: string;
}

export default function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  if (!videoUrl) {
    return (
      <div className="aspect-video border rounded flex items-center justify-center text-sm text-gray-500">
        Video coming soon: {title}
      </div>
    );
  }

  return (
    <video controls className="aspect-video w-full rounded border" src={videoUrl}>
      Your browser does not support video playback.
    </video>
  );
}
