// src/utils/msal-config.js
import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_APP_CLIENT_ID,
    authority: import.meta.env.VITE_APP_AUTHORITY,
    redirectUri: import.meta.env.VITE_APP_REDIRECT_URI,
    postLogoutRedirectUri: import.meta.env.VITE_APP_POSTLOGOUTREDIRECTURI,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    // Bound the hidden-iframe flows (ssoSilent) so they reject instead of
    // hanging when third-party cookies are blocked or the frame never posts
    // back — otherwise the loading gate can wait forever.
    iframeHashTimeout: 6000,
    loadFrameTimeout: 6000,
  },
};

export const loginRequest = {
  scopes: [
    "files.readwrite",
    "sites.selected",
    "User.Read",
  ],
};

export const ssoSilentRequest = { ...loginRequest };

let msalInstancePromise = null;

export const getMsalInstance = () => {
  if (!msalInstancePromise) {
    msalInstancePromise = (async () => {
      const instance = new PublicClientApplication(msalConfig);
      await instance.initialize();
      // Resolve any pending/left-over interaction so a stale
      // `interaction.status` flag can't pin `inProgress` away from None and
      // hang the route guards. Safe no-op for the popup-only flows here.
      try {
        await instance.handleRedirectPromise();
      } catch {
        /* ignore — recovery is handled by the auth watchdog */
      }
      const account =
        instance.getActiveAccount() || instance.getAllAccounts()[0];
      if (account) instance.setActiveAccount(account);
      return instance;
    })();
  }
  return msalInstancePromise;
};
