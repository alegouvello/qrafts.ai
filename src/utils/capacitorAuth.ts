import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

// Check if running in a native Capacitor environment
export const isNative = () => Capacitor.isNativePlatform();

// Custom URL scheme for the app
const APP_SCHEME = 'qrafts';

// Get the appropriate redirect URL based on platform
export const getAuthRedirectUrl = () => {
  if (isNative()) {
    // For native apps, use the custom URL scheme
    return `${APP_SCHEME}://auth/callback`;
  }
  // For web, use the standard redirect
  return `${window.location.origin}/auth`;
};

// Handle Google OAuth for native apps
export const handleNativeGoogleSignIn = async () => {
  if (!isNative()) {
    // Fall back to standard OAuth for web
    return null;
  }

  try {
    // Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
        skipBrowserRedirect: true, // Don't auto-redirect, we'll handle it
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned');

    // Open the OAuth URL in an in-app browser
    await Browser.open({ 
      url: data.url,
      presentationStyle: 'popover',
      windowName: '_blank'
    });

    return { success: true };
  } catch (error) {
    console.error('Native Google sign-in error:', error);
    return { success: false, error };
  }
};

// Set up deep link listener for OAuth callback
export const setupDeepLinkListener = (onAuthSuccess: () => void) => {
  if (!isNative()) return () => {};

  const handleDeepLink = async (event: { url: string }) => {
    console.log('Deep link received:', event.url);
    
    // Check if this is an auth callback
    if (event.url.startsWith(`${APP_SCHEME}://auth/callback`)) {
      // Close the browser
      await Browser.close();
      
      // Extract tokens from the URL
      const url = new URL(event.url.replace(`${APP_SCHEME}://`, 'https://'));
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Set the session manually
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (!error) {
          onAuthSuccess();
        } else {
          console.error('Error setting session:', error);
        }
      }
    }
  };

  // Listen for app URL open events
  App.addListener('appUrlOpen', handleDeepLink);

  // Return cleanup function
  return () => {
    App.removeAllListeners();
  };
};
