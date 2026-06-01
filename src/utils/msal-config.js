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
      const account =
        instance.getActiveAccount() || instance.getAllAccounts()[0];
      if (account) instance.setActiveAccount(account);
      return instance;
    })();
  }
  return msalInstancePromise;
};
