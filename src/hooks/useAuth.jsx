 
// src/hooks/useAuth.jsx
import { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import { useNavigate } from "react-router-dom";
import { fetchUserProfile, fetchUserProfileBeta } from "@/services/graph.service";
import { useSharePoint } from "./useSharePoint";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userProfileBeta, setUserProfileBeta] = useState(null);
  const { getUserRole, role } = useSharePoint();

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
    await authService.login();
    const authenticated = await authService.isAuthenticated();
    const token = await authService.getAccessToken();
    const account = (await authService.getAccount()) || {};
    const profile = await fetchUserProfile(token);
    const profileBeta = await fetchUserProfileBeta(token);


        // console.log({role});

    setAccessToken(token);
    setAccountInfo(account);
    setUserProfile({profileBeta, ...profile});
    setUserProfileBeta(profileBeta);
    setIsAuthenticated(authenticated);
    navigate("/home");
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

