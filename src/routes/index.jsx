// src/routes/index.js
import { createBrowserRouter } from "react-router-dom";
import AuthenticationPage from "@/pages/Authentication";
import MainLayout from "@/layouts/MainLayout";
import PrivateRoute from "./PrivateRoute";
import AdminRoute from "./AdminRoute";
import Survey from "@/pages/home";
import SurveyorDashboard from "@/pages/dashboard";
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
        element: <SurveyorDashboard />,
      },
      {
        path: "survey",
        element: <Survey />,
      },
      {
        path: "admin",
        element: (
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        ),
      },
    ],
  },
]);

export default router;
