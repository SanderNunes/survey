
// src/components/AuthenticationPage.jsx
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import LoginBanner from "../../assets/cuidar.jpg";
import MicrosoftLogo from "../../assets/microsoft.png";
import { Button } from "@material-tailwind/react";
import { useIsAuthenticated } from "@azure/msal-react";
import { Navigate } from "react-router-dom";

const AuthenticationPage = () => {
  const { login } = useAuth();
  const isAuthenticated = useIsAuthenticated()

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="grid grid-cols-4 gap-1 w-screen h-screen overflow-hidden">
      <div className="col-span-3  h-full shadow-sm shadow-black">
        <img
          src={LoginBanner}
          className="h-full w-full object-cover"
          alt="login-image"
        />
      </div>
      <div className="w-full">
        <div className="flex items-center justify-center h-screen">
          <div className="space-y-2 mb-6 flex flex-col items-center ">
            <h1 className="text-5xl font-bold text-center text-gray-900">
              Welcome Back
            </h1>
            <p className="text-xl text-gray-500 text-center">
              Sign with your work account
            </p>
            <Button
              className="flex gap-3 bg-white h-12 my-8 p-2 border w-full border-gray-300 rounded-md hover:shadow-sm hover:shadow-gray-500 text-gray-600  justify-center items-center cursor-pointer"
              onClick={login}
            >
              <img src={MicrosoftLogo} className="w-4 h-4" />
              <span className="">Entrar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};




const AuthenticationPage1 = () => {
  const tenantId =import.meta.env.VITE_APP_TENANT_ID; // Replace with your Tenant ID
  const clientId =import.meta.env.VITE_APP_CLIENT_ID; // Replace with your Client ID
  const redirectUri = encodeURIComponent("https://localhost:3000/home"); // Replace with your redirect URI

  const scope = encodeURIComponent("Calendars.ReadBasic");
  const state = "12345"; // Optional, used for CSRF protection

  const loginUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=${state}`;

  const handleLogin = () => {
    window.location.href = loginUrl;
  };

  return (
    <div>
      <h1>Login to Microsoft</h1>
      <button onClick={handleLogin}>Login with Microsoft</button>
    </div>
  );
};


export default AuthenticationPage;