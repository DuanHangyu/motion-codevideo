import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadFonts } from "../src/lib/fonts";
import "./app.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing from index.html");

loadFonts().catch((err) => console.error("font loading failed", err));

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
