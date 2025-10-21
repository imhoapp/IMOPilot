import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video } from "@/types/search";
import { formatViews } from "@/utils/format";

interface VideoGridProps {
  videos: Video[];
}

export const VideoGrid = ({ videos }: VideoGridProps) => {
  if (videos.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <Clock className="h-5 w-5 mr-2 text-primary" />
        Review Videos ({videos.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.slice(0, 9).map((video) => (
          <Card key={video.id} className="group hover-lift glass-card">
            <CardContent className="p-5">
              {video.thumbnail_url && (
                <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-muted/50 group-hover:shadow-md transition-all duration-300">
                  <img 
                    src={video.thumbnail_url} 
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="font-medium line-clamp-2 text-sm group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatViews(video.views)} views</span>
                  {video.likes > 0 && (
                    <span>{formatViews(video.likes)} likes</span>
                  )}
                </div>

                <Button 
                  asChild 
                  size="sm" 
                  className="w-full bg-gradient-secondary hover:shadow-md hover:shadow-primary/20 border-0 rounded-lg"
                  variant="default"
                >
                  <a 
                    href={video.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Watch Review
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};