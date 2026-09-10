import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { Levels } from "./pages/Levels.tsx";
import { Module } from "./pages/Module.tsx";
import { Lesson } from "./pages/Lesson.tsx";
import { Placement } from "./pages/Placement.tsx";
import { Review } from "./pages/Review.tsx";
import { Glossary } from "./pages/Glossary.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "trilha", element: <Levels /> },
      { path: "modules/:id", element: <Module /> },
      { path: "lessons/:id", element: <Lesson /> },
      { path: "review", element: <Review /> },
      { path: "glossary", element: <Glossary /> },
      { path: "placement", element: <Placement /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
