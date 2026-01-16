'use client';

import { useState, useCallback, useEffect } from 'react';
import { getMsalInstance, loginRequest, isEntraIDConfigured } from '@/lib/msal-config';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface MicrosoftAuthState {
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
}

export function useMicrosoftAuth() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [state, setState] = useState<MicrosoftAuthState>({
    isLoading: false,
    error: null,
    isConfigured: false,
  });

  useEffect(() => {
    setState(prev => ({ ...prev, isConfigured: isEntraIDConfigured() }));
  }, []);

  const signInWithMicrosoft = useCallback(async () => {
    const msalInstance = getMsalInstance();

    if (!msalInstance) {
      setState(prev => ({ ...prev, error: 'Microsoft authentication is not configured' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Initialize MSAL
      await msalInstance.initialize();

      // Try popup login first
      const response = await msalInstance.loginPopup(loginRequest);

      if (response.idToken) {
        // Send the authorization code to our backend
        const backendResponse = await fetch(`${API_URL}/api/v1/auth/microsoft/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: response.idToken,
            state: response.state || '',
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
      }
    } catch (error) {
      console.error('Microsoft login error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to sign in with Microsoft',
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [login, router]);

  const signInWithMicrosoftRedirect = useCallback(async () => {
    const msalInstance = getMsalInstance();

    if (!msalInstance) {
      setState(prev => ({ ...prev, error: 'Microsoft authentication is not configured' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await msalInstance.initialize();
      await msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Microsoft redirect error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Microsoft login',
      }));
    }
  }, []);

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

        // Send to backend
        const backendResponse = await fetch(`${API_URL}/api/v1/auth/microsoft/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: response.idToken,
            state: response.state || '',
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
  }, [login]);

  return {
    signInWithMicrosoft,
    signInWithMicrosoftRedirect,
    handleRedirectCallback,
    isLoading: state.isLoading,
    error: state.error,
    isConfigured: state.isConfigured,
    clearError: () => setState(prev => ({ ...prev, error: null })),
  };
}
