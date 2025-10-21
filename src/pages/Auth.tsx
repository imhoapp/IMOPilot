import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from '@/components/auth/AuthForm';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRecovery, setIsRecovery] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['auth-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    // Check if this is a password recovery flow or handle expired links
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    const type = urlParams.get('type') || hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const errorCode = hashParams.get('error_code') || urlParams.get('error_code');

    if (errorCode === 'otp_expired') {
      // Clear the hash and send user to the reset tab
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      navigate('/auth?tab=reset', { replace: true });
      // Inform the user
      setTimeout(() => {
        toast({
          title: 'Reset link expired',
          description: 'Please request a new password reset link.',
          variant: 'destructive',
        });
      }, 0);
      return;
    }

    // Only set recovery mode if type is explicitly 'recovery'
    // Don't trigger on OAuth tokens (which also include access_token/refresh_token)
    if (type === 'recovery') {
      setIsRecovery(true);
    }
  }, [navigate, toast]);

  useEffect(() => {
    // Only redirect authenticated users if it's NOT a recovery flow
    if (user && !loading && !profileLoading && !isRecovery) {
      // Check for stored redirect path
      const redirectPath = localStorage.getItem('redirectAfterAuth');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterAuth');
        
        // If it's a checkout redirect, navigate to the checkout page with params
        if (redirectPath.includes('/checkout')) {
          navigate(redirectPath, { replace: true });
        } else {
          navigate(redirectPath, { replace: true });
        }
      } else {
        // Redirect based on user role
        if (profile?.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    }
  }, [user, loading, profileLoading, profile, navigate, isRecovery]);

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-secondary rounded-full animate-[spin_1.5s_linear_infinite]"></div>
        </div>
      </div>
    );
  }

  if (user && !isRecovery) {
    return null; // Will redirect via useEffect
  }

  return <AuthForm isRecovery={isRecovery} />;
};

export default Auth;