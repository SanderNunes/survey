// src/services/graph.service.js
import axios from "axios";

export const fetchUserProfile = async (accessToken) => {
  if (!accessToken) {
    // console.error("Access token is required to fetch user profile");
    return;
  }

  try {
    const response = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with a status code out of 2xx range
      console.error(
        `Graph API error: ${error.response.status} - ${error.response.statusText}`
      );
      console.error("Details:", error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error("No response received from Graph API:", error.request);
    } else {
      // Something happened while setting up the request
      console.error("Error setting up Graph API request:", error.message);
    }
    return null;
  }
};
export const fetchUserProfileBeta = async (accessToken) => {
  if (!accessToken) {
    // console.error("Access token is required to fetch user profile");
    return;
  }

  try {
    const response = await axios.get(
      "https://graph.microsoft.com/beta/me/profile",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with a status code out of 2xx range
      console.error(
        `Graph API error: ${error.response.status} - ${error.response.statusText}`
      );
      console.error("Details:", error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error("No response received from Graph API:", error.request);
    } else {
      // Something happened while setting up the request
      console.error("Error setting up Graph API request:", error.message);
    }
    return null;
  }
};

export const fetchRecentFiles = async (accessToken) => {
  if (!accessToken) {
    // console.error("Access token is required to fetch user profile");
    return;
  }

  try {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/recent`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with a status code out of 2xx range
      console.error(
        `Graph API error: ${error.response.status} - ${error.response.statusText}`
      );
      console.error("Details:", error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error("No response received from Graph API:", error.request);
    } else {
      // Something happened while setting up the request
      console.error("Error setting up Graph API request:", error.message);
    }
    return null;
  }
};

export const fetchCalendarEvents = async (accessToken) => {
  if (!accessToken) {
    // console.error("Access token is required to fetch user profile");
    return;
  }

  try {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/calendarview?startdatetime=${today.toISOString()}&enddatetime=${sevenDaysFromNow.toISOString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with a status code out of 2xx range
      console.error(
        `Graph API error: ${error.response.status} - ${error.response.statusText}`
      );
      console.error("Details:", error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error("No response received from Graph API:", error.request);
    } else {
      // Something happened while setting up the request
      console.error("Error setting up Graph API request:", error.message);
    }
    return null;
  }
};


