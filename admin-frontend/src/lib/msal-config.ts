import { Configuration, LogLevel, PublicClientApplication } from '@azure/msal-browser';

// MSAL configuration - values come from environment variables
// Supports both standard Entra ID and Entra External ID (CIAM) tenants
const getAuthority = () => {
  // If a custom authority is provided (for CIAM), use it as-is
  if (process.env.NEXT_PUBLIC_ENTRA_AUTHORITY) {
    const authority = process.env.NEXT_PUBLIC_ENTRA_AUTHORITY.replace(/\/$/, '');
    // Ensure authority ends with /v2.0 for proper token validation
    return authority.endsWith('/v2.0') ? authority : `${authority}/v2.0`;
  }
  // Default to standard Entra ID authority
  return `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_ENTRA_TENANT_ID || 'common'}/v2.0`;
};

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID || '',
    authority: getAuthority(),
    redirectUri: process.env.NEXT_PUBLIC_ENTRA_REDIRECT_URI || 'http://localhost:3001/auth/callback',
    postLogoutRedirectUri: '/',
    navigateToLoginRequestUrl: true,
    knownAuthorities: ['tensparrowsmicrodatacluster.ciamlogin.com'],
  },
  cache: {
    cacheLocation: 'sessionStorage', // More secure than localStorage
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

// Scopes for sign-in
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
  prompt: 'select_account' as const,
};

// Scopes for MDC API access - acquires a token with the correct audience
export const mdcApiRequest = {
  scopes: [process.env.NEXT_PUBLIC_MDC_SCOPE || 'api://617db85e-dc5c-42a4-be72-5a20d2f7ccff/MDC.Access'],
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
