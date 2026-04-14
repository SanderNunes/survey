 
// src/hooks/useAuth.jsx
import { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import { useNavigate } from "react-router-dom";
import { fetchUserProfile, fetchUserProfileBeta } from "@/services/graph.service";
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userProfileBeta, setUserProfileBeta] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await authService.isAuthenticated();
      setIsAuthenticated(isAuthenticated);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const isAuth = async () => {
      if (isAuthenticated) {
        
        const token = await authService.getAccessToken();
        const account = (await authService.getAccount()) || {};
        const profile = await fetchUserProfile(token);
        const profileBeta = await fetchUserProfileBeta(token);



        setAccessToken(token);
        setAccountInfo(account);
        setUserProfile({profileBeta, ...profile});
        setUserProfileBeta(profileBeta);
      }
    };

    isAuth();
  }, [isAuthenticated]);

  const login = async () => {
    // Step 1: open the Microsoft login popup — if this throws, abort
    await authService.login();

    // Step 2: navigate immediately after successful authentication,
    // then load profile data in the background so a slow Graph call
    // never blocks the redirect
    navigate("/home");

    try {
      const authenticated = await authService.isAuthenticated();
      const token = await authService.getAccessToken();
      const account = (await authService.getAccount()) || {};
      const [profile, profileBeta] = await Promise.all([
        fetchUserProfile(token),
        fetchUserProfileBeta(token),
      ]);

      setAccessToken(token);
      setAccountInfo(account);
      setUserProfile({ profileBeta, ...(profile || {}) });
      setUserProfileBeta(profileBeta);
      setIsAuthenticated(authenticated);
    } catch (err) {
      console.error('Error loading user profile after login:', err);
      // Auth succeeded — profile load failed. Still authenticated.
      setIsAuthenticated(true);
    }
  };

  const logout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setAccessToken(null);
    setAccountInfo(null);
    setUserProfile(null);
    setUserProfileBeta(null)
  };

  return {
    isAuthenticated,
    accessToken,
    accountInfo,
    userProfile,
    userProfileBeta,
    login,
    logout
  };
};

