// src/hooks/useAuth.jsx
import { useCallback, useState } from "react";
import { fetchCalendarEvents, fetchRecentFiles } from "@/services/graph.service";
import { useAuth } from "./useAuth";

export function useGraph() {
  const { accessToken, userProfile } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState(null);
  const [recentFiles, setRecentFiles] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);

  const getCalendarEvents = useCallback(
    async () => {
      if (!accessToken) {
        console.error("Failed to acquire access token");
        return null;
      }

      try {
        const getItems = await fetchCalendarEvents(accessToken);
        setCalendarEvents(getItems.value)
      } catch (error) {
        console.error("Error getting events:", error);
        return null;
      }
    },
    [accessToken]
  );

  const getRecentFiles = useCallback(
    async () => {
      if (!accessToken) {
        console.error("Failed to acquire access token");
        return null;
      }

      try {
        const getItems = await fetchRecentFiles(accessToken);
        setRecentFiles(getItems.value)
      } catch (error) {
        console.error("Error getting events:", error);
        return null;
      }
    },
    [accessToken]
  );

  const getMyProfilePhoto =useCallback( async () => {
    try {
      if(userProfile){
        const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
  
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
  
        setProfilePhoto(imageUrl);
      }
    } catch (error) {
      // console.error("Error fetching profile photo:", error);
      // throw error;
    }
  },[accessToken]
  );

const getEmails = useCallback(async (options = {}) => {
  const {
    dateRange = 30,
    status = 'all',
    top = 50
  } = options;

  try {
    if (userProfile) {
      
      // Calculate date filter
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);
      const dateFilter = `receivedDateTime ge ${startDate.toISOString()}`;
  
      // Build status filters
      let statusFilters = [];
  
      if (status === 'read') {
        statusFilters.push('isRead eq true');
      } else if (status === 'unread') {
        statusFilters.push('isRead eq false');
      } else if (status === 'important') {
        statusFilters.push('importance eq \'high\'');
      }
  
      // Combine all filters
      const filters = [dateFilter, ...statusFilters];
      const filterQuery = filters.length > 0 ? `$filter=${filters.join(' and ')}` : '';
  
      // Build the complete URL
      const baseUrl = 'https://graph.microsoft.com/v1.0/me/messages';
      const queryParams = [
        filterQuery,
        `$top=${top}`,
        '$orderby=receivedDateTime desc',
        '$select=id,subject,from,receivedDateTime,isRead,importance,hasAttachments,bodyPreview'
      ].filter(param => param).join('&');
  
      const url = `${baseUrl}?${queryParams}`;
  
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          emails: data.value,
          totalCount: data['@odata.count'] || data.value.length,
          nextLink: data['@odata.nextLink']
        };
      } else {
        const errorData = await response.json();
         console.error(`Graph API Error: ${errorData.error?.message || 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error('Error fetching emails:', error);
    return {
      success: false,
      error: error.message,
      emails: []
    };
  }
}, [accessToken]);


  return {
    calendarEvents,
    recentFiles,
    profilePhoto,
    getEmails,
    getCalendarEvents,
    getRecentFiles,
    getMyProfilePhoto
  };
};

