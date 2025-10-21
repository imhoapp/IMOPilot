import { motion } from "framer-motion";
import { useState } from "react";
import { Play, Eye, ThumbsUp, Youtube, Video as VideoIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/ui/video-player";

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  platform: string;
}

interface VideoReviewsProps {
  productId: string;
  videos?: Video[];
}

export const VideoReviews = ({ productId, videos = [] }: VideoReviewsProps) => {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedVideo(null);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-3 w-3 mr-1" />;
      case 'tiktok':
        return <VideoIcon className="h-3 w-3 mr-1" />;
      default:
        return <VideoIcon className="h-3 w-3 mr-1" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return 'bg-red-600';
      case 'tiktok':
        return 'bg-black';
      default:
        return 'bg-primary';
    }
  };


  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="space-y-6 pt-12"
    >
      <div className="flex items-center space-x-3">
        <VideoIcon className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold">Video Reviews</h2>
      </div>

      {videos.length === 0 ? (
        <Card className="border-2 border-dashed border-muted-foreground/20">
          <CardContent className="py-12 text-center">
            <VideoIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2 text-muted-foreground">
              No Video Reviews Found
            </h3>
            <p className="text-sm text-muted-foreground/80">
              We couldn't find any video reviews for this product yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <motion.div
              key={video.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -4 }}
            >
              <Card 
                className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300"
                onClick={() => handleVideoClick(video)}
              >
                <div className="relative aspect-video overflow-hidden">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Youtube className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-red-600 rounded-full p-3">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </div>
                  </div>

                  {/* Platform badge */}
                  <Badge 
                    variant="secondary" 
                    className={`absolute top-2 right-2 text-white border-0 ${getPlatformColor(video.platform)}`}
                  >
                    {getPlatformIcon(video.platform)}
                    {video.platform}
                  </Badge>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                  
                  {video.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {video.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      {video.views > 0 && (
                        <div className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {formatNumber(video.views)}
                        </div>
                      )}
                      {video.likes > 0 && (
                        <div className="flex items-center">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {formatNumber(video.likes)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Video Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 [&>button]:hidden">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold pr-8">
                {selectedVideo?.title}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeDialog}
                className="absolute right-4 top-4"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 p-6 pt-0">
            {selectedVideo && (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden bg-black">
                  {selectedVideo.video_url.includes('youtube.com') || selectedVideo.video_url.includes('youtu.be') ? (
                    <iframe
                      src={selectedVideo.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full aspect-video"
                      allowFullScreen
                      title={selectedVideo.title}
                    />
                  ) : (
                    <VideoPlayer 
                      src={selectedVideo.video_url}
                      thumbnail={selectedVideo.thumbnail_url}
                      title={selectedVideo.title}
                      className="w-full aspect-video"
                    />
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge 
                      variant="secondary" 
                      className={`text-white border-0 ${getPlatformColor(selectedVideo.platform)}`}
                    >
                      {getPlatformIcon(selectedVideo.platform)}
                      {selectedVideo.platform}
                    </Badge>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {selectedVideo.views > 0 && (
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          {formatNumber(selectedVideo.views)} views
                        </div>
                      )}
                      {selectedVideo.likes > 0 && (
                        <div className="flex items-center">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {formatNumber(selectedVideo.likes)} likes
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedVideo.video_url, '_blank', 'noopener,noreferrer')}
                  >
                    View on {selectedVideo.platform}
                  </Button>
                </div>
                
                {selectedVideo.description && (
                  <div className="pt-2">
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedVideo.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};