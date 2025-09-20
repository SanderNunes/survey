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
import { useAuth } from "./hooks/useAuth";

// Loader component for handling MSAL initialization
function AuthLoader({ children }) {
  const [msalInstance, setMsalInstance] = useState(null);
  const [error, setError] = useState(null);

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
    const initMsal = async () => {
      try {
        const instance = await getMsalInstance();

        // Optional delay to prevent loading flicker
        setTimeout(() => {
          setMsalInstance(instance);
        }, 200);
      } catch (err) {
        console.error("MSAL initialization failed:", err);
        setError("Authentication service is currently unavailable.");
      }
    };

    initMsal();
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
      </div>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}

// Main App component
export default function App() {
  return (
    <AuthLoader>
      <RouterProvider router={router} />
    </AuthLoader>
  );
}
