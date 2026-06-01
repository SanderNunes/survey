// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const PrivateRoute = ({ children }) => {
    const { accounts, inProgress } = useMsal();

    if (inProgress !== InteractionStatus.None) {
        return (
            <div className="flex items-center justify-center w-screen h-screen">
                <LoadingSkeleton />
            </div>
        );
    }

    if (accounts.length === 0) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PrivateRoute;
