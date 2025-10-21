import { useState } from "react";
import { Upload, Star, X, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VideoPlayer } from "@/components/ui/video-player";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  productId: string;
  onUploadSuccess: () => void;
}

export const VideoUpload = ({ productId, onUploadSuccess }: VideoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploading) return; // Prevent changes during upload
    
    const file = e.target.files?.[0];
    setValidationErrors([]);
    
    if (file) {
      const errors: string[] = [];
      
      // Validate file type
      if (!file.type.startsWith('video/') || (!file.type.includes('mp4') && !file.type.includes('mov'))) {
        errors.push("📹 Please select an MP4 or MOV video file only");
      }
      
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        errors.push("📦 Video file must be smaller than 50MB");
      }
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      
      setVideoFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  const handleRemoveVideo = () => {
    if (uploading) return; // Prevent changes during upload
    
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    const fileInput = document.getElementById('video-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    setValidationErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: string[] = [];
    
    if (!videoFile) errors.push("📹 Please upload a video file first");
    if (!title.trim()) errors.push("✏️ Please enter a review title");
    if (!description.trim()) errors.push("📝 Please add a detailed description");
    if (rating === 0) errors.push("⭐ Please give a star rating");
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Please complete all required fields",
        description: "Check the highlighted fields below.",
        variant: "destructive"
      });
      return;
    }
    
    setValidationErrors([]);

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload a review.",
          variant: "destructive"
        });
        return;
      }

      // Upload video to storage
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('review-videos')
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('review-videos')
        .getPublicUrl(fileName);

      // Save review metadata
      const { error: reviewError } = await supabase
        .from('user_reviews')
        .insert({
          user_id: user.id,
          product_id: productId,
          title: title.trim(),
          description: description.trim(),
          rating,
          video_url: publicUrl
        });

      if (reviewError) throw reviewError;

      toast({
        title: "Review uploaded",
        description: "Your video review has been submitted successfully!"
      });

      // Reset form
      setTitle("");
      setDescription("");
      setRating(0);
      handleRemoveVideo();
      
      onUploadSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Video className="h-5 w-5" />
          <span>Share Your Video Review</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mb-6 border-destructive/30 bg-destructive/10">
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold text-destructive text-sm">Please complete the following:</p>
                <div className="space-y-2">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                      <span className="text-destructive font-medium">{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="video-upload" className="text-base font-medium">
              Video Upload <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Upload an MP4 or MOV file (max 50MB). Share your honest experience with this product.
            </p>
            
            {!videoFile ? (
              <div className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors rounded-2xl p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <Input
                  id="video-upload"
                  type="file"
                  accept="video/mp4,video/mov,.mp4,.mov"
                  onChange={handleVideoChange}
                  className="hidden"
                  disabled={uploading}
                />
                <Label 
                  htmlFor="video-upload" 
                  className={cn(
                    "cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors",
                    uploading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Choose Video File
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported formats: MP4, MOV (max 50MB)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{videoFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="video-upload-change"
                      type="file"
                      accept="video/mp4,video/mov,.mp4,.mov"
                      onChange={handleVideoChange}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      type="button" 
                      disabled={uploading}
                      onClick={() => {
                        const fileInput = document.getElementById('video-upload-change') as HTMLInputElement;
                        fileInput?.click();
                      }}
                    >
                      Change
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={handleRemoveVideo}
                      disabled={uploading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {videoPreview && (
                  <div className="rounded-2xl overflow-hidden">
                    <VideoPlayer 
                      src={videoPreview}
                      title="Video Preview"
                      className="w-full aspect-video"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="title" className="text-base font-medium">
              Review Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 'Great product, highly recommend!' or 'Had some issues but...'"
              className="mt-2"
              disabled={uploading}
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-base font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                // Auto-grow functionality
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.max(100, target.scrollHeight)}px`;
              }}
              placeholder="Tell us about your experience with this product. What stood out to you? Would you recommend it to others?"
              className="min-h-[100px] resize-none overflow-hidden"
              rows={4}
              disabled={uploading}
            />
          </div>

          <div>
            <Label className="text-base font-medium">
              Rating <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Rate your overall satisfaction with this product.
            </p>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => !uploading && setRating(star)}
                  onMouseEnter={() => !uploading && setHoveredRating(star)}
                  onMouseLeave={() => !uploading && setHoveredRating(0)}
                  className={cn(
                    "p-1 hover:scale-110 transition-transform rounded-md hover:bg-muted",
                    uploading && "cursor-not-allowed opacity-50"
                  )}
                  disabled={uploading}
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground hover:text-yellow-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-3 text-sm font-medium">
                {rating > 0 ? (
                  <span className="text-primary">{rating}/5 stars</span>
                ) : (
                  <span className="text-muted-foreground">Click to rate</span>
                )}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={uploading || !videoFile || !title.trim() || !description.trim() || rating === 0}
            className="w-full bg-gradient-primary hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50"
            size="lg"
          >
            {uploading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Uploading your review...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Submit Video Review</span>
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};