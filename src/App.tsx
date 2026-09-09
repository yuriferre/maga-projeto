import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { Levels } from "./pages/Levels.tsx";
import { Module } from "./pages/Module.tsx";
import { Lesson } from "./pages/Lesson.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Levels /> },
      { path: "modules/:id", element: <Module /> },
      { path: "lessons/:id", element: <Lesson /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
