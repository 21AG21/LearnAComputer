interface VideoPlayerProps {
  videoUrl: string;
  title: string;
}

export default function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  if (!videoUrl) return null;

  return (
    <video controls aria-label={title} className="aspect-video w-full rounded border" src={videoUrl}>
      Your browser does not support video playback.
    </video>
  );
}
