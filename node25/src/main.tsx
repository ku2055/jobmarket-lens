import { createRoot } from "react-dom/client";
import { Studio } from "./Studio";
import { Admin } from "./Admin";
import "./style.css";
createRoot(document.getElementById("root")!).render(
  location.pathname.replace(/\/$/, "") === "/admin" ? <Admin /> : <Studio />,
);
