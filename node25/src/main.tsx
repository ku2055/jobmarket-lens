import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Studio } from "./Studio";
import { Admin } from "./Admin";
import "./style.css";
const SpatialLab = lazy(() => import("./spatial/SpatialLab"));
const route = location.pathname.replace(/\/$/, "");
createRoot(document.getElementById("root")!).render(
  route === "/admin" ? (
    <Admin />
  ) : route === "/spatial" ? (
    <Suspense
      fallback={
        <main className="spatial-loading" role="status">
          Loading Spatial Lab…
        </main>
      }
    >
      <SpatialLab />
    </Suspense>
  ) : (
    <Studio />
  ),
);
