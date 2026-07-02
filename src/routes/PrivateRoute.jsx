// src/components/PrivateRoute.jsx
import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useAuthWatchdog, ResetButton } from "@/hooks/useAuthWatchdog";

const PrivateRoute = ({ children }) => {
    const { accounts, inProgress } = useMsal();
    const loading = inProgress !== InteractionStatus.None;
    const { timedOut, reset } = useAuthWatchdog(loading);

    useEffect(() => {
      if (!loading && accounts.length > 0) reset();
    }, [loading, accounts.length, reset]);

    if (loading) {
        return (
            <div className="flex items-center justify-center w-screen h-screen">
                <LoadingSkeleton />
                {timedOut && <ResetButton />}
            </div>
        );
    }

    if (accounts.length === 0) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PrivateRoute;
