// src/services/auth.service.js
import { getMsalInstance, loginRequest } from "../utils/msal-config";

export const authService = {
  login: async () => {
    const msalInstance = await getMsalInstance();

    // Get current domain/origin
    const currentOrigin = window.location.origin;

    // Create state parameter with origin and any additional data
    const stateData = new URLSearchParams({
      origin: currentOrigin,
      timestamp: Date.now().toString(),
      // Add other state data as needed
    });

    const loginRequestMapped = {
      ...loginRequest,
      state: stateData.toString(), // This will be URL-encoded automatically
    };

    // Proceed with MSAL login
    await msalInstance.loginPopup(loginRequestMapped);
  },

  logout: async () => {
    const msalInstance = await getMsalInstance();
    await msalInstance.logoutPopup();
  },

  getAccessToken: async () => {
    const msalInstance = await getMsalInstance();
    if (!msalInstance.controller.initialized) return null;

    const accounts = msalInstance.getAllAccounts();
    if (!accounts.length) return null;

    const account = accounts[0];

    // 1. Acquire token silently; fall back to popup if silent fails
    let response;
    try {
      response = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
    } catch {
      try {
        response = await msalInstance.acquireTokenPopup(loginRequest);
      } catch (popupError) {
        console.error('Token acquisition failed:', popupError);
        return null;
      }
    }

    if (!response?.accessToken) return null;

    // 2. Force-refresh if token expires within 5 minutes
    try {
      const payload = JSON.parse(atob(response.accessToken.split('.')[1]));
      if (payload.exp * 1000 - Date.now() <= 300_000) {
        response = await msalInstance.acquireTokenSilent({ ...loginRequest, account, forceRefresh: true });
      }
    } catch {
      // If decode or refresh fails, use the token we already have
    }

    return response.accessToken;
  },

  getAccount: async () => {
    const msalInstance = await getMsalInstance();
    const accounts = msalInstance.getAllAccounts();

    return accounts[0] || null;
  },

  isAuthenticated: async () => {
    const msalInstance = await getMsalInstance();
    return msalInstance.getAllAccounts().length > 0;
  },
};
