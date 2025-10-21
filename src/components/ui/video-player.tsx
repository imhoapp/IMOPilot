import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  thumbnail?: string;
  title?: string;
  className?: string;
}

const isYouTubeUrl = (url: string) => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const getYouTubeEmbedUrl = (url: string) => {
  if (url.includes('youtube.com/watch?v=')) {
    return url.replace('youtube.com/watch?v=', 'youtube.com/embed/');
  }
  if (url.includes('youtu.be/')) {
    return url.replace('youtu.be/', 'youtube.com/embed/');
  }
  return url;
};

export const VideoPlayer = ({ src, thumbnail, title, className }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleVideoClick = () => {
    togglePlay();
  };

  // If it's a YouTube URL, render iframe instead
  if (isYouTubeUrl(src)) {
    return (
      <div className={cn("relative bg-muted rounded-2xl overflow-hidden", className)}>
        <iframe
          src={getYouTubeEmbedUrl(src)}
          className="w-full h-full"
          allowFullScreen
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative bg-muted rounded-2xl overflow-hidden group cursor-pointer",
        className
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        poster={thumbnail}
        onClick={handleVideoClick}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        controls={false}
        preload="metadata"
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Play/Pause overlay */}
      <div 
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity",
          !isPlaying ? "opacity-100" : showControls ? "opacity-100" : "opacity-0"
        )}
        onClick={handleVideoClick}
      >
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="bg-white/90 hover:bg-white text-foreground rounded-full p-4"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
        </Button>
      </div>

      {/* Control bar */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
          
          {title && (
            <p className="text-white text-sm font-medium truncate flex-1 mx-4">
              {title}
            </p>
          )}
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};