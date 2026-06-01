// src/services/auth.service.js
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import {
  getMsalInstance,
  loginRequest,
  ssoSilentRequest,
} from "../utils/msal-config";
import {
  clearSsoLoginHint,
  getSsoLoginHint,
  setSsoLoginHint,
} from "../utils/sso-hint";

function getAuthState() {
  return new URLSearchParams({
    origin: window.location.origin,
    timestamp: Date.now().toString(),
  }).toString();
}

export const authService = {
  login: async () => {
    const msalInstance = await getMsalInstance();
    const loginHint = getSsoLoginHint();

    const response = await msalInstance.loginPopup({
      ...loginRequest,
      state: getAuthState(),
      ...(loginHint ? { loginHint } : {}),
    });

    if (response?.account) {
      msalInstance.setActiveAccount(response.account);
      setSsoLoginHint(response.account);
    }
    return response;
  },

  ssoSilent: async () => {
    const msalInstance = await getMsalInstance();
    try {
      const loginHint = getSsoLoginHint();
      const response = await msalInstance.ssoSilent({
        ...ssoSilentRequest,
        state: getAuthState(),
        ...(loginHint ? { loginHint } : {}),
      });
      if (response?.account) {
        msalInstance.setActiveAccount(response.account);
        setSsoLoginHint(response.account);
      }
      return response?.account || null;
    } catch {
      return null;
    }
  },

  logout: async () => {
    const msalInstance = await getMsalInstance();
    clearSsoLoginHint();
    await msalInstance.logoutPopup();
  },

  getAccessToken: async () => {
    const msalInstance = await getMsalInstance();
    const account =
      msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    if (!account) return null;

    let response;
    try {
      response = await msalInstance.acquireTokenSilent({ ...loginRequest, account });

      if (response.expiresOn && response.expiresOn.getTime() - Date.now() <= 300_000) {
        response = await msalInstance.acquireTokenSilent({ ...loginRequest, account, forceRefresh: true });
      }
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        response = await msalInstance.acquireTokenPopup({ ...loginRequest, account });
      } else {
        throw err;
      }
    }

    if (response?.account) {
      msalInstance.setActiveAccount(response.account);
      setSsoLoginHint(response.account);
    }
    return response?.accessToken || null;
  },

  getAccount: async () => {
    const msalInstance = await getMsalInstance();
    return (
      msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null
    );
  },

  isAuthenticated: async () => {
    const msalInstance = await getMsalInstance();
    return msalInstance.getAllAccounts().length > 0;
  },
};
