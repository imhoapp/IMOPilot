import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordStrengthMeter, calculatePasswordStrength } from './PasswordStrengthMeter';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
    <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
  </svg>
);

interface AuthFormProps {
  isRecovery?: boolean;
}

export const AuthForm = ({ isRecovery = false }: AuthFormProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { toast } = useToast();

  // Get current tab from URL or default to 'signin'
  const currentTab = searchParams.get('tab') || 'signin';

  // Function to change tab and update URL
  const changeTab = (tab: string) => {
    setSearchParams({ tab });
  };


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully."
      });

      // Redirect to home
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "An error occurred during sign in.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password strength
    const passwordStrength = calculatePasswordStrength(password);
    if (!passwordStrength.isValid) {
      toast({
        title: "Password too weak",
        description: "Please create a stronger password that meets the requirements.",
        variant: "destructive"
      });
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "A confirmation link has been sent to your email address."
      });
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        toast({
          title: "Account exists",
          description: "This email is already registered. Please sign in instead.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sign up failed",
          description: error.message || "An error occurred during sign up.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth?tab=reset`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast({
        title: "Reset link sent",
        description: "Check your email for a password reset link."
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "An error occurred while sending the reset email.",
        variant: "destructive"
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password strength
    const passwordStrength = calculatePasswordStrength(newPassword);
    if (!passwordStrength.isValid) {
      toast({
        title: "Password too weak",
        description: "Please create a stronger password that meets the requirements.",
        variant: "destructive"
      });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been successfully updated."
      });

      // Redirect to home
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "An error occurred while updating your password.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message || "An error occurred during Google sign in.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {/* Desktop Layout */}
      <Card className="hidden md:block w-full max-w-md mx-4">
        {isRecovery ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyUp={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                      required
                    />
                  <PasswordStrengthMeter password={newPassword} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p className="text-sm text-destructive">Passwords do not match</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating password...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold tracking-tight">Welcome</CardTitle>
              <CardDescription>Sign in to your account or create a new one</CardDescription>
            </CardHeader>
        <CardContent>
            <Tabs value={currentTab} onValueChange={changeTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="reset">Reset</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <GoogleIcon />
                <span className="ml-2">Continue with Google</span>
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setPassword((e.target as HTMLInputElement).value)}
                    required
                  />
                  <PasswordStrengthMeter password={password} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-sm text-destructive">Passwords do not match</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <GoogleIcon />
                <span className="ml-2">Continue with Google</span>
              </Button>
            </TabsContent>
            
            <TabsContent value="reset" className="space-y-4">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? 'Sending reset link...' : 'Send Reset Link'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        </>
        )}
      </Card>

      {/* Mobile App-style Layout */}
      <div className="md:hidden w-full px-6 py-8">
        {isRecovery ? (
          <div className="space-y-8">
            {/* App-style Header */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-2xl">
                  <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m0 0a2 2 0 01-2 2m0 0a2 2 0 010-4zm0 0a2 2 0 010-4z" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
                <p className="text-muted-foreground mt-2">Enter your new password below</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="new-password-mobile" className="text-base font-medium">New Password</Label>
                    <Input
                      id="new-password-mobile"
                      type="password"
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyUp={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                      required
                      className="h-12 rounded-xl text-base"
                    />
                   <PasswordStrengthMeter password={newPassword} />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="confirm-password-mobile" className="text-base font-medium">Confirm Password</Label>
                   <Input
                     id="confirm-password-mobile"
                     type="password"
                     placeholder="Confirm your new password"
                     value={confirmNewPassword}
                     onChange={(e) => setConfirmNewPassword(e.target.value)}
                     required
                     className="h-12 rounded-xl text-base"
                   />
                   {confirmNewPassword && newPassword !== confirmNewPassword && (
                     <p className="text-sm text-destructive">Passwords do not match</p>
                   )}
                 </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" 
                disabled={loading}
              >
                {loading ? 'Updating password...' : 'Update Password'}
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-8">
            {/* App-style Header */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-2xl">
                  <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Welcome to IMO</h1>
                <p className="text-muted-foreground mt-2">Your AI-powered product research assistant</p>
              </div>
            </div>

            <Tabs value={currentTab} onValueChange={changeTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-muted/50">
                <TabsTrigger value="signin" className="rounded-lg text-sm font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg text-sm font-medium">Sign Up</TabsTrigger>
                <TabsTrigger value="reset" className="rounded-lg text-sm font-medium">Reset</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-6 mt-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email-mobile" className="text-base font-medium">Email</Label>
                      <Input
                        id="signin-email-mobile"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 rounded-xl text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password-mobile" className="text-base font-medium">Password</Label>
                      <Input
                        id="signin-password-mobile"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-12 rounded-xl text-base"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" 
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full h-12 rounded-xl text-base" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <GoogleIcon />
                  <span className="ml-2">Continue with Google</span>
                </Button>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-6 mt-6">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name-mobile" className="text-base font-medium">Full Name</Label>
                      <Input
                        id="signup-name-mobile"
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="h-12 rounded-xl text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email-mobile" className="text-base font-medium">Email</Label>
                      <Input
                        id="signup-email-mobile"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 rounded-xl text-base"
                      />
                    </div>
                     <div className="space-y-2">
                       <Label htmlFor="signup-password-mobile" className="text-base font-medium">Password</Label>
                        <Input
                          id="signup-password-mobile"
                          type="password"
                          placeholder="Create a password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyUp={(e) => setPassword((e.target as HTMLInputElement).value)}
                          required
                          className="h-12 rounded-xl text-base"
                        />
                       <PasswordStrengthMeter password={password} />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="signup-confirm-password-mobile" className="text-base font-medium">Confirm Password</Label>
                       <Input
                         id="signup-confirm-password-mobile"
                         type="password"
                         placeholder="Confirm your password"
                         value={confirmPassword}
                         onChange={(e) => setConfirmPassword(e.target.value)}
                         required
                         className="h-12 rounded-xl text-base"
                       />
                       {confirmPassword && password !== confirmPassword && (
                         <p className="text-sm text-destructive">Passwords do not match</p>
                       )}
                     </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" 
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full h-12 rounded-xl text-base" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <GoogleIcon />
                  <span className="ml-2">Continue with Google</span>
                </Button>
              </TabsContent>
              
              <TabsContent value="reset" className="space-y-6 mt-6">
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email-mobile" className="text-base font-medium">Email</Label>
                      <Input
                        id="reset-email-mobile"
                        type="email"
                        placeholder="Enter your email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="h-12 rounded-xl text-base"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" 
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Sending reset link...' : 'Send Reset Link'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};