import React from "react";
import ReactDOM from "react-dom/client";
import AppConfigured from "./components/app-configured";
import "@cloudscape-design/global-styles/index.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);


root.render(
  <React.StrictMode>
    <AppConfigured />
  </React.StrictMode>,
);
