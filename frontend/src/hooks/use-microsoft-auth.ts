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

// Key for storing intended login type
const LOGIN_TYPE_KEY = 'msal_login_type';

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

  // Process account info from Microsoft and create user session
  const processAccountInfo = useCallback((account: AccountInfo, idToken?: string, isAdmin?: boolean) => {
    // Check if this was an admin login (from stored value or parameter)
    const storedLoginType = localStorage.getItem(LOGIN_TYPE_KEY);
    const shouldBeAdmin = isAdmin || storedLoginType === 'admin';

    // Debug logging
    console.log('[Auth Debug] processAccountInfo called:', {
      isAdmin,
      storedLoginType,
      shouldBeAdmin,
    });

    // Clear the stored login type
    localStorage.removeItem(LOGIN_TYPE_KEY);

    // Extract user info from the Microsoft account
    const user = {
      id: account.localAccountId || account.homeAccountId,
      email: account.username,
      name: account.name || account.username,
      role: shouldBeAdmin ? 'admin' as const : 'user' as const,
      organizationId: 'org-' + account.tenantId,
      entraIdOid: account.localAccountId,
      authProvider: 'entra_id' as const,
      createdAt: new Date().toISOString(),
    };

    // Create a mock organization for now (can be updated when backend is ready)
    const organization = {
      id: 'org-' + account.tenantId,
      name: account.name ? `${account.name}'s Organization` : 'My Organization',
      slug: 'my-org',
      plan: 'professional' as const,
      createdAt: new Date().toISOString(),
    };

    // Store the ID token if available
    if (idToken) {
      localStorage.setItem('accessToken', idToken);
    }

    // Debug logging
    console.log('[Auth Debug] User object:', { role: user.role, email: user.email });

    // Update auth store
    login(user, organization);

    // Debug logging
    console.log('[Auth Debug] Redirecting to:', shouldBeAdmin ? '/admin' : '/dashboard');

    // Redirect based on role
    if (shouldBeAdmin) {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }

    return { user, organization };
  }, [login, router]);

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

  const signInWithMicrosoft = useCallback(async (options: { isSignUp?: boolean; isAdmin?: boolean } = {}) => {
    const { isSignUp = false, isAdmin = false } = options;
    console.log('[Auth Debug] signInWithMicrosoft called with:', { options, isAdmin });
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

    // Store the login type for redirect flow
    if (isAdmin) {
      localStorage.setItem(LOGIN_TYPE_KEY, 'admin');
    } else {
      localStorage.setItem(LOGIN_TYPE_KEY, 'user');
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
        processAccountInfo(response.account, response.idToken, isAdmin);
      }
    } catch (error: unknown) {
      console.error('Microsoft login error:', error);

      // Clear stored login type on error
      localStorage.removeItem(LOGIN_TYPE_KEY);

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

  const signInWithMicrosoftRedirect = useCallback(async (options: { isSignUp?: boolean; isAdmin?: boolean } = {}) => {
    const { isSignUp = false, isAdmin = false } = options;
    const msalInstance = getMsalInstance();

    if (!msalInstance) {
      setState(prev => ({ ...prev, error: 'Microsoft authentication is not configured' }));
      return;
    }

    if (!state.isInitialized) {
      setState(prev => ({ ...prev, error: 'Authentication is initializing. Please try again.' }));
      return;
    }

    // Store the login type for redirect flow
    if (isAdmin) {
      localStorage.setItem(LOGIN_TYPE_KEY, 'admin');
    } else {
      localStorage.setItem(LOGIN_TYPE_KEY, 'user');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const request = isSignUp
        ? { ...loginRequest, prompt: 'create' as const }
        : loginRequest;

      await msalInstance.loginRedirect(request);
    } catch (error) {
      console.error('Microsoft redirect error:', error);
      localStorage.removeItem(LOGIN_TYPE_KEY);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Microsoft login',
      }));
    }
  }, [state.isInitialized]);

  // Convenience methods
  const signInAsUser = useCallback(() => signInWithMicrosoft({ isAdmin: false }), [signInWithMicrosoft]);
  const signInAsAdmin = useCallback(() => signInWithMicrosoft({ isAdmin: true }), [signInWithMicrosoft]);
  const signUpWithMicrosoft = useCallback(() => signInWithMicrosoft({ isSignUp: true }), [signInWithMicrosoft]);

  return {
    signInWithMicrosoft: signInAsUser,
    signInAsAdmin,
    signUpWithMicrosoft,
    signInWithMicrosoftRedirect: (isAdmin = false) => signInWithMicrosoftRedirect({ isAdmin }),
    isLoading: state.isLoading,
    error: state.error,
    isConfigured: state.isConfigured,
    isInitialized: state.isInitialized,
    clearError: () => setState(prev => ({ ...prev, error: null })),
  };
}
