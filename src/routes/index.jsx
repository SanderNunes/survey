// src/routes/index.js
import { createBrowserRouter } from "react-router-dom";
import AuthenticationPage from "@/pages/Authentication";
import MainLayout from "@/layouts/MainLayout";
import PrivateRoute from "./PrivateRoute";
import SearchResultsPage from "@/pages/SearchResultPage";
import Academy from "@/pages/Academy";
import Admin from "@/pages/Academy/Admin";
import Home from "@/pages/home";
import CourseDetails from "@/pages/Academy/CourseDetails";
import ProfilePage from "@/pages/Profile";
import Analytics from "@/pages/Dashboard/Analytics";
import SystemAudit from "@/pages/Dashboard/SystemAudit";
import Quality from "@/pages/Dashboard/Quality";
import VersionControl from "@/pages/Dashboard/VersionControl";
import CourseView from "@/pages/Academy/CourseView";
// import Cellito from "@/pages/Bot/Index";
import ExampleComp from "@/pages/Bot/example";
import DocumentManagentPage from "@/pages/Dashboard/ContentManagement/Documents";
import CourseManagementPage from "@/pages/Dashboard/ContentManagement/Courses";
import ArticleManagementPage from "@/pages/Dashboard/ContentManagement/Articles";
import ArticlesFeedPage from "@/pages/Articles/Feed";
import CreateArticlePage from "@/pages/Dashboard/ContentManagement/Articles/Create";
import ArticleViewPage from "@/pages/Articles/View";
import TestCourse from "@/pages/test";
import CreateCoursePage from "@/pages/Dashboard/ContentManagement/Courses/create";
import EventCreate from "@/pages/Dashboard/ContentManagement/Events/Create";
import EventViewPage from "@/pages/Dashboard/ContentManagement/Events";
import Cellito from "@/pages/Bot/example";
import TeamPage from "@/pages/Team";
import Calendar from "@/pages/Calendar/Public";
import Feedbacks from "@/pages/Feedbacks/Create";
import FeedbacksForm from "@/pages/Feedbacks";
import TeamManagementPage from "@/pages/Dashboard/ContentManagement/Team";
import TeamMemberForm from "@/pages/Dashboard/ContentManagement/Team/create";
import DashboardLayout from "@/layouts/Dashboard";

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
        name: "",
        slug: "",
        path: "",
        element: <Home />,
      },
      {
        name: "query",
        slug: "query",
        path: "query",
        element: <SearchResultsPage />,
      },
      {
        name: "ts",
        slug: "ts",
        path: "tsc",
        element: <TestCourse />,
      },
      {
        name: "profile",
        slug: "profile",
        path: "profile",
        element: <ProfilePage />,
      },
      // Academy Routes
      {
        name: "academy",
        slug: "academy",
        path: "academy",
        element: <Academy />,
      },
      {
        name: "course-start",
        slug: "academy/:courseId/start",
        path: "academy/:courseId/start",
        element: <CourseView />,
      },
      {
        name: "academy-dashboard",
        slug: "academy/dashboard",
        path: "academy/dashboard",
        element: <Admin />,
      },
      {
        name: "cellito",
        slug: "cellito",
        path: "cellito",
        element: <Cellito />,
      },

      {
        name: "quality-assurance",
        slug: "quality-assurance",
        path: "quality-assurance",
        element: <Quality />,
      },

      {
        name: "course-detail",
        slug: "academy/course/:courseId",
        path: "academy/course/:courseId",
        element: <CourseDetails />,
      },
      {
        name: "courseview",
        slug: "courseview", // 👈 Dynamic route
        path: "academy/course/:courseId/start",
        element: <CourseView />,
      },
      // Dashboard Routes
      {
        name: "analytics",
        slug: "analytics",
        path: "analytics",
        element: <Analytics />,
      },
      {
        name: "content-management/courses",
        slug: "content-management/courses",
        path: "content-management/courses",
        element: <CourseManagementPage />,
      },
      {
        name: "content-management/courses",
        slug: "content-management/courses",
        path: "content-management/courses/:courseID",
        element: <CreateCoursePage />,
      },
      {
        name: "content-management/courses",
        slug: "content-management/courses",
        path: "content-management/courses/:courseID/:isView",
        element: <CreateCoursePage />,
      },
      {
        name: "content-management/courses/create",
        slug: "content-management/courses/create",
        path: "content-management/courses/create",
        element: <CreateCoursePage />,
      },
      {
        name: "content-management/articles",
        slug: "content-management/articles",
        path: "content-management/articles",
        element: <ArticleManagementPage />,
      },
      {
        name: "content-management/articles/create",
        slug: "content-management/articles/create",
        path: "content-management/articles/create",
        element: <CreateArticlePage />,
      },
      {
        name: "content-management/articles/view",
        slug: "content-management/articles/view",
        path: "content-management/articles/view/:slug",
        element: <CreateArticlePage view={'edit'} />,
      },
      {
        name: "content-management/documents",
        slug: "content-management/documents",
        path: "content-management/documents",
        element: <DocumentManagentPage />,
      },
      {
        name: "system-audit",
        slug: "system-audit",
        path: "system-audit",
        element: <SystemAudit />,
      },
      {
        name: "articles-feed",
        slug: "articles-feed",
        path: "articles-feed",
        element: <ArticlesFeedPage />,
      },
      {
        name: "articles",
        slug: "articles",
        path: "articles/:slug",
        element: <ArticleViewPage />,
      },
      {
        name: "version-control",
        slug: "version-control",
        path: "version-control",
        element: <VersionControl />,
      },
      {
        name: "team",
        slug: "team",
        path: "team",
        element: <TeamPage />,
      },
      {
        name: "content-management-team",
        slug: "content-management-team",
        path: "content-management/team",
        element: <TeamManagementPage />,
      },
      {
        name: "content-management-team-view",
        slug: "content-management-team-view",
        path: "content-management/team/view/:id",
        element: <TeamMemberForm view="view"/>,
      },
      // Calendar Views
      {
        name: "calendar",
        slug: "calendar",
        path: "calendar",
        element: <Calendar />,
      },
      // Feedbacks 
      {
        name: "feedbacks",
        slug: "feedbacks",
        path: "feedbacks",
        element: <Feedbacks />,
      },
      {
        name: "feedbacks/create",
        slug: "feedbacks/create",
        path: "feedbacks/create",
        element: <FeedbacksForm />,
      },
       {
        name: "feedbacks/view",
        slug: "feedbacks/view",
        path: "feedbacks/view/:feedbackId",
        element: <FeedbacksForm view='view'/>,
      },
      {
        name: "content-management/events",
        slug: "content-management/events",
        path: "content-management/events",
        element: <EventViewPage />,
      },
      {
        name: "content-management/events/create",
        slug: "content-management/events/create",
        path: "content-management/events/create",
        element: <EventCreate />,
      },
      {
        name: "content-management/events/view",
        slug: "content-management/events/view",
        path: "content-management/events/view/:eventId", // Fixed: changed :id to :eventId
        element: <EventCreate view='view' />,
      },

      {
        name: "content-management/feedbacks",
        slug: "content-management/feedbacks",
        path: "content-management/feedbacks",
        element: <DashboardLayout><Feedbacks /></DashboardLayout>,
      },
      {
        name: "content-management/feedbacks/create",
        slug: "content-management/feedbacks/create",
        path: "content-management/feedbacks/create",
        element: <DashboardLayout><FeedbacksForm /></DashboardLayout>,
      },
      {
        name: "content-management/feedbacks/view",
        slug: "content-management/feedbacks/view",
        path: "content-management/feedbacks/view/:feedbackId",
        element: <DashboardLayout><FeedbacksForm view='view' /></DashboardLayout>,
      },
    ],
  },
]);

export default router;
