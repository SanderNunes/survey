// src/components/PrivateRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const PrivateRoute = ({ children }) => {
    const isAuthenticated = useIsAuthenticated();
    const { accounts } = useMsal();
    const authed = isAuthenticated && accounts.length > 0;
    const [redirect, setRedirect] = useState(false);

    useEffect(() => {
        if (!authed) {
            const timer = setTimeout(() => setRedirect(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [authed]);

    if (!authed && !redirect) {
        return (
            <div className="flex items-center justify-center w-screen h-screen">
                <LoadingSkeleton />
            </div>
        );
    }

    if (!authed) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PrivateRoute;
