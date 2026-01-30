'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AccountInfo } from '@azure/msal-browser';
import { getMsalInstance, loginRequest, isEntraIDConfigured } from '@/lib/msal-config';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

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
        const response = await msalInstance.handleRedirectPromise();

        // If we got a response from redirect, process it
        if (response?.account) {
          processAccountInfo(response.account, response.idToken);
        }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Process account info from Microsoft and create user session
  const processAccountInfo = useCallback((account: AccountInfo, idToken?: string) => {
    // Extract user info from the Microsoft account
    const user = {
      id: account.localAccountId || account.homeAccountId,
      email: account.username,
      name: account.name || account.username,
      roles: ['user'], // Default role
      entraIdOid: account.localAccountId,
      authProvider: 'entra_id' as const,
    };

    // Create a mock organization for now (can be updated when backend is ready)
    const organization = {
      id: 'org-' + account.tenantId,
      name: account.name ? `${account.name}'s Organization` : 'My Organization',
      slug: 'my-org',
    };

    // Store the ID token if available
    if (idToken) {
      localStorage.setItem('accessToken', idToken);
    }

    // Update auth store
    login(user, organization);

    // Redirect to dashboard
    router.push('/dashboard');

    return { user, organization };
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

      if (response.account) {
        processAccountInfo(response.account, response.idToken);
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
  }, [state.isInitialized, processAccountInfo]);

  const signInWithMicrosoftRedirect = useCallback(async (isSignUp: boolean = false) => {
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
      const request = isSignUp
        ? { ...loginRequest, prompt: 'create' as const }
        : loginRequest;

      await msalInstance.loginRedirect(request);
    } catch (error) {
      console.error('Microsoft redirect error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Microsoft login',
      }));
    }
  }, [state.isInitialized]);

  // Sign up with Microsoft (triggers the sign-up flow)
  const signUpWithMicrosoft = useCallback(async () => {
    return signInWithMicrosoft(true);
  }, [signInWithMicrosoft]);

  // Sign up with redirect
  const signUpWithMicrosoftRedirect = useCallback(async () => {
    return signInWithMicrosoftRedirect(true);
  }, [signInWithMicrosoftRedirect]);

  return {
    signInWithMicrosoft: () => signInWithMicrosoft(false),
    signUpWithMicrosoft,
    signInWithMicrosoftRedirect: () => signInWithMicrosoftRedirect(false),
    signUpWithMicrosoftRedirect,
    isLoading: state.isLoading,
    error: state.error,
    isConfigured: state.isConfigured,
    isInitialized: state.isInitialized,
    clearError: () => setState(prev => ({ ...prev, error: null })),
  };
}
