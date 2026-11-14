import React from "react";
import { createRoot } from "react-dom/client";
import GraphiteRoot from "./GraphiteRoot";

import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "./styles.css";
import "./backgrounds.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GraphiteRoot />
  </React.StrictMode>,
);

import "./suite/refinements.css";

import "./suite/roadmap.css";
