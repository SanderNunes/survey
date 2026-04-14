/* eslint-disable no-unused-vars */
// src/utils/msal-config.js
import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_APP_CLIENT_ID,
    authority: import.meta.env.VITE_APP_AUTHORITY,
    redirectUri: import.meta.env.VITE_APP_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

let msalInstance = PublicClientApplication | null;

export const loginRequest = {scopes : [
    "files.readwrite",
    "sites.readwrite.all",
    "User.Read",
    "User.ReadBasic.All",
  ]};


export const getMsalInstance = async () => {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize(); // This ensures full initialization
  }
  return msalInstance;
};

const scopes = [
    "files.readwrite",
    "sites.readwrite.all",
    "User.Read",
    "User.Read.All",
    "Directory.Read.All",
    "Organization.Read.All",
    "User.ReadBasic.All",
    "Calendars.Read",
    "https://africellcloud.sharepoint.com/.default",
  ]



