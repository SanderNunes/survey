// src/components/PrivateRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useIsAuthenticated } from "@azure/msal-react";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const PrivateRoute = ({ children }) => {
    const isAuthenticated = useIsAuthenticated();
    const [redirect, setRedirect] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            // Start a timer to redirect after 1.5 seconds
            const timer = setTimeout(() => {
                setRedirect(true);
            }, 1500); // 1.5 seconds

            // Cleanup the timer on component unmount or if isAuthenticated changes
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated]);

    if (!isAuthenticated && !redirect) {
      return (
        <div className="flex items-center justify-center w-screen h-screen">
          <LoadingSkeleton />
        </div>
      );
}

    if (!isAuthenticated && redirect) {
        return <Navigate to="/" replace />;
    }

    // Authenticated, render the protected content
    return children;
};

export default PrivateRoute;
