import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PlayCircle } from "lucide-react";

export const YouTubeVideosSkeleton = () => {
  return (
    <div className="space-y-6 pt-12">
      <div className="flex items-center space-x-3">
        <PlayCircle className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold">YouTube Reviews</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="glass-card overflow-hidden">
            <CardContent className="p-0">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};