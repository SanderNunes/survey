// src/routes/index.js
import { createBrowserRouter } from "react-router-dom";
import AuthenticationPage from "@/pages/Authentication";
import MainLayout from "@/layouts/MainLayout";
import PrivateRoute from "./PrivateRoute";
import Survey from "@/pages/home";
import AdminPage from "@/pages/admin";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthenticationPage />,
  },
  {
    path: "/home/*",
    element: (
      <PrivateRoute>
        <MainLayout />
      </PrivateRoute>
    ),
    children: [
      {
        path: "",
        element: <Survey />,
      },
      {
        path: "admin",
        element: <AdminPage />,
      },
    ],
  },
]);

export default router;
