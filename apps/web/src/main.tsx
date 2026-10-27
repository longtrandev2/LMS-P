import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Providers } from "@/components/providers";
import { AppRouter } from "@/app/router";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";
import "@/app/globals.css";

// Data router (để có `useBlocker` chặn nút Back khi còn thay đổi chưa lưu); route con vẫn khai báo bằng <Routes>.
const router = createBrowserRouter([{ path: "*", element: <Providers><AppRouter /></Providers> }]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
