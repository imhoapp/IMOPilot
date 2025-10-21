import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Key, MessageSquare, Trash2, Star, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SearchHeader } from '@/components/search/SearchHeader';
import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface UserReview {
  id: string;
  title: string;
  description: string | null;
  rating: number;
  created_at: string;
  product_id: string;
  products: {
    title: string;
  };
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Get current tab from URL hash or default to 'personal'
  const getCurrentTab = () => {
    const hash = location.hash.replace('#', '');
    return ['personal', 'reviews', 'subscription'].includes(hash) 
      ? hash 
      : 'personal';
  };
  
  const currentTab = getCurrentTab();
  
  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    navigate(`/profile#${value}`, { replace: true });
  };
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not found');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!user?.id,
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        email: profile.email || user?.email || '',
      });
    }
  }, [profile, user?.email]);

  // Fetch user reviews
  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['user-reviews', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not found');
      
      const { data, error } = await supabase
        .from('user_reviews')
        .select(`
          *,
          products (
            title
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserReview[];
    },
    enabled: !!user?.id,
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          email: profileData.email,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('user_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: "Review deleted",
        description: "Your review has been deleted successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['user-reviews', user?.id] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete review",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        }`}
      />
    ));
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="bg-background">
      {/* Desktop Layout */}
      <div className="hidden md:block container mx-auto px-6 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Subscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                      />
                    </div>
                    <Button type="submit" disabled={isUpdatingProfile}>
                      {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Your Reviews
                </CardTitle>
                <CardDescription>
                  Manage your submitted product reviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : reviews?.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't submitted any reviews yet. Start exploring products and share your thoughts!
                    </p>
                    <Button onClick={() => navigate('/')}>
                      Browse Products
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews?.map((review) => (
                      <Card key={review.id} className="border-l-4 border-l-primary/20">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg mb-1">{review.title}</h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                Review for: {review.products.title}
                              </p>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center">
                                  {renderStars(review.rating)}
                                </div>
                                <Badge variant="secondary">
                                  {review.rating}/5 stars
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(review.created_at)}
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Review</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this review? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteReview(review.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          {review.description && (
                            <>
                              <Separator className="mb-3" />
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {review.description}
                              </p>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <SubscriptionManagement />
          </TabsContent>

        </Tabs>
      </div>

      {/* Mobile App-style Layout */}
      <div className="md:hidden px-4 pb-8">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-muted/30">
            <TabsTrigger value="personal" className="flex items-center gap-1 rounded-lg text-xs font-medium">
              <User className="h-3 w-3" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-1 rounded-lg text-xs font-medium">
              <MessageSquare className="h-3 w-3" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-1 rounded-lg text-xs font-medium">
              <Star className="h-3 w-3" />
              Premium
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-6">
            {/* Profile Info Card */}
            <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-4 space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-3 rounded-2xl">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Personal Information</h2>
                  <p className="text-sm text-muted-foreground">Update your details</p>
                </div>
              </div>
              
              {profileLoading ? (
                <div className="space-y-3">
                  <div className="h-12 bg-muted/50 rounded-xl animate-pulse" />
                  <div className="h-12 bg-muted/50 rounded-xl animate-pulse" />
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name_mobile" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="full_name_mobile"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                      className="h-12 rounded-xl text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email_mobile" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email_mobile"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      className="h-12 rounded-xl text-base"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isUpdatingProfile} 
                    className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              )}
            </div>

            {/* Password Change Card */}
            <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-4 space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 p-3 rounded-2xl">
                  <Key className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Change Password</h2>
                  <p className="text-sm text-muted-foreground">Keep your account secure</p>
                </div>
              </div>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password_mobile" className="text-sm font-medium">New Password</Label>
                  <Input
                    id="new_password_mobile"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    className="h-12 rounded-xl text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password_mobile" className="text-sm font-medium">Confirm Password</Label>
                  <Input
                    id="confirm_password_mobile"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    className="h-12 rounded-xl text-base"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isChangingPassword}
                  className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-500/90 hover:to-red-500/90"
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4 mt-6">
            <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-3 rounded-2xl">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Your Reviews</h2>
                  <p className="text-sm text-muted-foreground">Manage your reviews</p>
                </div>
              </div>

              {reviewsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : reviews?.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-muted/30 p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                  <p className="text-muted-foreground mb-4 text-sm px-4">
                    Start exploring products and share your thoughts!
                  </p>
                  <Button 
                    onClick={() => navigate('/')}
                    className="rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    Browse Products
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews?.map((review) => (
                    <div key={review.id} className="bg-background/50 border rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base truncate">{review.title}</h4>
                          <p className="text-xs text-muted-foreground mb-2 truncate">
                            {review.products.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {renderStars(review.rating)}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {review.rating}/5
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <div className="text-xs text-muted-foreground">
                            {formatDate(review.created_at)}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive p-2 h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="mx-4">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Review</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteReview(review.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {review.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {review.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4 mt-6">
            <SubscriptionManagement />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}