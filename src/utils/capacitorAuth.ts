import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from '@/integrations/supabase/client';

// Check if running in a native Capacitor environment
export const isNative = () => Capacitor.isNativePlatform();

// Google OAuth Client ID (Web Client ID from Google Cloud Console)
const GOOGLE_WEB_CLIENT_ID = '205344056886-ckkqqu7l4cslur15g59nj49qsq1s36fh.apps.googleusercontent.com';

// Initialize Google Auth for native platforms
export const initGoogleAuth = async () => {
  if (!isNative()) return;
  
  try {
    await GoogleAuth.initialize({
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    console.log('Google Auth initialized for native platform');
  } catch (error) {
    console.error('Failed to initialize Google Auth:', error);
  }
};

// Get the appropriate redirect URL based on platform
export const getAuthRedirectUrl = () => {
  // For web, use the standard redirect
  return `${window.location.origin}/auth`;
};

// Handle Google OAuth for native apps using Google Sign-In SDK
export const handleNativeGoogleSignIn = async (): Promise<{ success: boolean; error?: any }> => {
  if (!isNative()) {
    return { success: false, error: 'Not running in native environment' };
  }

  try {
    // Sign in with Google using native SDK
    const googleUser = await GoogleAuth.signIn();
    console.log('Google Sign-In successful:', googleUser);
    
    if (!googleUser.authentication?.idToken) {
      throw new Error('No ID token received from Google');
    }

    // Use the ID token to sign in with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleUser.authentication.idToken,
      access_token: googleUser.authentication.accessToken,
    });

    if (error) {
      console.error('Supabase sign-in error:', error);
      return { success: false, error };
    }

    console.log('Supabase sign-in successful:', data.user?.email);
    return { success: true };
  } catch (error) {
    console.error('Native Google sign-in error:', error);
    return { success: false, error };
  }
};

// Sign out from Google (for native)
export const handleNativeGoogleSignOut = async () => {
  if (!isNative()) return;
  
  try {
    await GoogleAuth.signOut();
    console.log('Google Sign-Out successful');
  } catch (error) {
    console.error('Google Sign-Out error:', error);
  }
};

// Placeholder for deep link listener (no longer needed with native SDK approach)
export const setupDeepLinkListener = (_onAuthSuccess: () => void) => {
  return () => {}; // No-op cleanup function
};
