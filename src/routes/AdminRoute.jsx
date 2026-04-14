// src/routes/AdminRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSharePoint } from "@/hooks/useSharePoint";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const AdminRoute = ({ children }) => {
  const { sp, checkIsOwner } = useSharePoint();
  const [isOwner, setIsOwner] = useState(null); // null = loading

  useEffect(() => {
    if (!sp) return;
    checkIsOwner().then(setIsOwner);
  }, [sp, checkIsOwner]);

  if (isOwner === null) {
    return (
      <div className="flex items-center justify-center w-screen h-screen">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!isOwner) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default AdminRoute;
