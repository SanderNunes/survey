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

    // 1. Try to get a token from the cache
    let response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    });

    // 2. Decode token to check expiration
    const payload = JSON.parse(atob(response.accessToken.split(".")[1]));
    const expiresAt = payload.exp * 1000; // ms
    const now = Date.now();

    // 3. If expiring soon (e.g., within 5 minutes), force refresh
    const bufferSeconds = 300; // 5 min
    if (expiresAt - now <= bufferSeconds * 1000) {
      console.log("Token expiring soon, refreshing...");
      response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
        forceRefresh: true,
      });
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
