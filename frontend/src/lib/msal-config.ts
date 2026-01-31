import { Configuration, LogLevel, PublicClientApplication } from '@azure/msal-browser';

// MSAL configuration - values come from environment variables
// Supports both standard Entra ID and Entra External ID (CIAM) tenants
const getAuthority = () => {
  // If a custom authority is provided (for CIAM), use it as-is
  if (process.env.NEXT_PUBLIC_ENTRA_AUTHORITY) {
    return process.env.NEXT_PUBLIC_ENTRA_AUTHORITY.replace(/\/$/, '');
  }
  // Default to standard Entra ID authority
  return `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_ENTRA_TENANT_ID || 'common'}`;
};

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID || '',
    authority: getAuthority(),
    redirectUri: process.env.NEXT_PUBLIC_ENTRA_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    postLogoutRedirectUri: '/',
    navigateToLoginRequestUrl: true,
    knownAuthorities: process.env.NEXT_PUBLIC_ENTRA_AUTHORITY
      ? [process.env.NEXT_PUBLIC_ENTRA_AUTHORITY.replace(/\/$/, '')]
      : [],
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          case LogLevel.Info:
            if (process.env.NODE_ENV === 'development') {
              console.info(message);
            }
            return;
          default:
            return;
        }
      },
      logLevel: process.env.NODE_ENV === 'development' ? LogLevel.Warning : LogLevel.Error,
    },
  },
};

// Scopes for authentication - CIAM uses simpler scopes
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};

// Create MSAL instance
let msalInstance: PublicClientApplication | null = null;

export const getMsalInstance = (): PublicClientApplication | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!msalInstance && msalConfig.auth.clientId) {
    msalInstance = new PublicClientApplication(msalConfig);
  }

  return msalInstance;
};

// Check if Entra ID is configured
export const isEntraIDConfigured = (): boolean => {
  return !!(
    process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID &&
    process.env.NEXT_PUBLIC_ENTRA_TENANT_ID
  );
};
