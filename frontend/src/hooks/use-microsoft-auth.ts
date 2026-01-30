'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { InteractionStatus } from '@azure/msal-browser';
import { getMsalInstance, loginRequest, isEntraIDConfigured } from '@/lib/msal-config';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface MicrosoftAuthState {
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  isInitialized: boolean;
}

export function useMicrosoftAuth() {
  const router = useRouter();
  const { login } = useAuthStore();
  const initializingRef = useRef(false);
  const [state, setState] = useState<MicrosoftAuthState>({
    isLoading: false,
    error: null,
    isConfigured: false,
    isInitialized: false,
  });

  // Initialize MSAL and handle any pending redirects on mount
  useEffect(() => {
    const initializeMsal = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;

      const msalInstance = getMsalInstance();
      if (!msalInstance) {
        setState(prev => ({ ...prev, isConfigured: false, isInitialized: true }));
        return;
      }

      try {
        await msalInstance.initialize();

        // Handle any pending redirect - this clears stale interaction state
        await msalInstance.handleRedirectPromise();

        setState(prev => ({
          ...prev,
          isConfigured: isEntraIDConfigured(),
          isInitialized: true,
        }));
      } catch (error) {
        console.error('MSAL initialization error:', error);
        setState(prev => ({
          ...prev,
          isConfigured: isEntraIDConfigured(),
          isInitialized: true,
        }));
      }
    };

    initializeMsal();
  }, []);

  const processAuthResponse = useCallback(async (idToken: string, responseState?: string) => {
    // Send the ID token to our backend
    const backendResponse = await fetch(`${API_URL}/api/v1/auth/microsoft/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: idToken,
        state: responseState || '',
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.error?.message || 'Authentication failed');
    }

    const authData = await backendResponse.json();

    // Store tokens
    if (authData.tokens?.accessToken) {
      localStorage.setItem('accessToken', authData.tokens.accessToken);
      localStorage.setItem('refreshToken', authData.tokens.refreshToken);
    }

    // Update auth store
    login(authData.user, authData.organization);

    // Redirect based on role
    if (authData.user.roles?.includes('admin') || authData.user.roles?.includes('operator')) {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }

    return authData;
  }, [login, router]);

  const signInWithMicrosoft = useCallback(async (isSignUp: boolean = false) => {
    const msalInstance = getMsalInstance();

    if (!msalInstance) {
      setState(prev => ({ ...prev, error: 'Microsoft authentication is not configured' }));
      return;
    }

    // Check if MSAL is initialized
    if (!state.isInitialized) {
      setState(prev => ({ ...prev, error: 'Authentication is initializing. Please try again.' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // For sign-up, use prompt: 'create' to show the sign-up experience
      // This works with Entra External ID (CIAM) tenants
      const request = isSignUp
        ? { ...loginRequest, prompt: 'create' as const }
        : loginRequest;

      // Try popup login
      const response = await msalInstance.loginPopup(request);

      if (response.idToken) {
        await processAuthResponse(response.idToken, response.state);
      }
    } catch (error: unknown) {
      console.error('Microsoft login error:', error);

      // Handle specific MSAL errors
      let errorMessage = 'Failed to sign in with Microsoft';

      if (error instanceof Error) {
        if (error.message.includes('interaction_in_progress')) {
          errorMessage = 'Please close any open login windows and try again.';
          // Try to clear the interaction state
          try {
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length === 0) {
              // Clear browser storage to reset MSAL state
              sessionStorage.clear();
            }
          } catch {
            // Ignore cleanup errors
          }
        } else if (error.message.includes('user_cancelled')) {
          errorMessage = 'Sign in was cancelled.';
        } else if (error.message.includes('popup_window_error')) {
          errorMessage = 'Popup was blocked. Please allow popups for this site.';
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isInitialized, processAuthResponse]);

  const signInWithMicrosoftRedirect = useCallback(async () => {
    const msalInstance = getMsalInstance();

    if (!msalInstance) {
      setState(prev => ({ ...prev, error: 'Microsoft authentication is not configured' }));
      return;
    }

    if (!state.isInitialized) {
      setState(prev => ({ ...prev, error: 'Authentication is initializing. Please try again.' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Microsoft redirect error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Microsoft login',
      }));
    }
  }, [state.isInitialized]);

  const handleRedirectCallback = useCallback(async () => {
    const msalInstance = getMsalInstance();

    if (!msalInstance) {
      return null;
    }

    try {
      await msalInstance.initialize();
      const response = await msalInstance.handleRedirectPromise();

      if (response?.idToken) {
        setState(prev => ({ ...prev, isLoading: true }));
        const authData = await processAuthResponse(response.idToken, response.state);
        setState(prev => ({ ...prev, isLoading: false }));
        return authData;
      }
    } catch (error) {
      console.error('Redirect callback error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to complete authentication',
      }));
    }

    return null;
  }, [processAuthResponse]);

  // Sign up with Microsoft (triggers the sign-up flow)
  const signUpWithMicrosoft = useCallback(async () => {
    return signInWithMicrosoft(true);
  }, [signInWithMicrosoft]);

  return {
    signInWithMicrosoft: () => signInWithMicrosoft(false),
    signUpWithMicrosoft,
    signInWithMicrosoftRedirect,
    handleRedirectCallback,
    isLoading: state.isLoading,
    error: state.error,
    isConfigured: state.isConfigured,
    isInitialized: state.isInitialized,
    clearError: () => setState(prev => ({ ...prev, error: null })),
  };
}
