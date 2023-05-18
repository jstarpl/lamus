import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import "./index.css";
import { App } from "./App";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <Router>
    <App />
  </Router>
);

console.log(
  "💻 %cLamus%c starting now",
  "font-weight: bold",
  "font-weight: normal"
);

navigator.serviceWorker.register(
  new URL("./serviceWorker.ts", import.meta.url),
  { type: "module" }
);
