// import { RouterProvider } from "react-router-dom";
// import router from './routes'
// import { useEffect, useState } from "react";
// import { getMsalInstance } from "./utils/msal-config";
// import { MsalProvider } from "@azure/msal-react";
// import LoadingSkeleton from "./components/LoadingSkeleton";

// function App() {

//   const [msalInstance, setMsalInstance] = useState(null);

//   useEffect(() => {
//     const initMsal = async () => {
//       const instance = await getMsalInstance();
//       setMsalInstance(instance);
//     };
//     initMsal();
//   }, []);

//   if (!msalInstance)
//     return (
//       <div className="flex items-center justify-center w-screen h-screen">
//         <LoadingSkeleton />
//       </div>
//     );

//   return (
//     <>
//     <MsalProvider instance={msalInstance}>
//       <RouterProvider router={router} />
//     </MsalProvider>
//     </>
//   )
// }

// export default App

import { RouterProvider } from "react-router-dom";
import router from "./routes";
import { useEffect, useState } from "react";
import { getMsalInstance } from "./utils/msal-config";
import { MsalProvider } from "@azure/msal-react";
import LoadingSkeleton from "./components/LoadingSkeleton";
import { useAuthWatchdog, ResetButton } from "./hooks/useAuthWatchdog";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary";
import { authService } from "./services/auth.service";

let authBootstrapPromise = null;

function bootstrapAuth() {
  if (!authBootstrapPromise) {
    authBootstrapPromise = (async () => {
      const instance = await getMsalInstance();
      if (instance.getAllAccounts().length === 0) {
        await authService.ssoSilent();
      }
      return instance;
    })();
  }
  return authBootstrapPromise;
}

// Loader component for handling MSAL initialization
function AuthLoader({ children }) {
  const [msalInstance, setMsalInstance] = useState(null);
  const [error, setError] = useState(null);
  const { timedOut } = useAuthWatchdog(!msalInstance && !error);

useEffect(() => {
  // Run only if NOT localhost
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return;
  }

  // Prevent right-click
  const disableContextMenu = (e) => e.preventDefault();

  // Prevent certain key combinations
  const disableInspectKeys = (e) => {
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") || // Ctrl+Shift+I
      (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "j") || // Ctrl+Shift+J
      (e.ctrlKey && e.key.toLowerCase() === "u") // Ctrl+U
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  document.addEventListener("contextmenu", disableContextMenu);
  document.addEventListener("keydown", disableInspectKeys);

  return () => {
    document.removeEventListener("contextmenu", disableContextMenu);
    document.removeEventListener("keydown", disableInspectKeys);
  };
}, []);


  useEffect(() => {
    let cancelled = false;
    const initMsal = async () => {
      try {
        const instance = await bootstrapAuth();
        if (!cancelled) setMsalInstance(instance);
      } catch (err) {
        console.error("MSAL initialization failed:", err);
        if (!cancelled) setError("Authentication service is currently unavailable.");
      }
    };

    initMsal();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-50 text-center px-4">
        <h1 className="text-xl font-semibold text-red-500 mb-2">Error</h1>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!msalInstance) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-50 animate-fadeIn">
        <LoadingSkeleton />
        {timedOut && <ResetButton />}
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </MsalProvider>
  );
}

function hasOAuthParams() {
  const keys = ["code", "state", "access_token", "id_token", "error", "session_state"];
  const rawHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(rawHash);
  const searchParams = new URLSearchParams(window.location.search);
  return keys.some((key) => hashParams.has(key) || searchParams.has(key));
}

function isEmbeddedFrame() {
  try {
    return window.parent && window.parent !== window;
  } catch {
    return false;
  }
}

function OAuthCompleting() {
  return (
    <div className="flex items-center justify-center w-screen h-screen bg-gray-50 animate-fadeIn">
      <LoadingSkeleton />
    </div>
  );
}

// Main App component
export default function App() {
  if (window.location.pathname === "/" && hasOAuthParams() && (window.opener || isEmbeddedFrame())) {
    return <OAuthCompleting />;
  }

  return (
    <AuthLoader>
      <RouterProvider router={router} />
    </AuthLoader>
  );
}
