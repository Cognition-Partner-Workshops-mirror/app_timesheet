import { PublicClientApplication, type Configuration, LogLevel } from '@azure/msal-browser';

/**
 * MSAL configuration for Microsoft Entra ID (Azure AD) SSO authentication.
 * Reads client ID and tenant ID from Vite environment variables.
 * Falls back to 'common' tenant for multi-tenant scenarios.
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
    },
  },
};

/**
 * Scopes requested during MSAL login.
 * User.Read, openid, profile, email are standard for user info retrieval.
 */
export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

/**
 * Singleton MSAL PublicClientApplication instance.
 * Exported so it can be used both in React components (via MsalProvider)
 * and outside React (e.g., in the Axios interceptor).
 */
export const msalInstance = new PublicClientApplication(msalConfig);
