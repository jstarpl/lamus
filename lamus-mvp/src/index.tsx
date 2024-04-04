import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import "./index.css";
import { App } from "./App";
import pwaWorker from "./serviceWorker?worker&url";

import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://065f3082d52fffcc6447604e4ea13fe3@o1312861.ingest.sentry.io/4506280422604800",
  integrations: [
    new Sentry.BrowserTracing({
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: ["localhost", /^https:\/\/lamus\.cloud\/api/],
    }),
    new Sentry.Replay(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(pwaWorker, {
    type: "module",
  });
}
