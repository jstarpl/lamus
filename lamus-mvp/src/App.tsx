import React, { useCallback, useEffect, useLayoutEffect } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import "./App.css";
import {
  KeyboardHandler,
  useKeyboardHandler,
} from "./helpers/useKeyboardHandler";
import { AppStore } from "./stores/AppStore";
import { useMouseWheelSink } from "./helpers/useMouseWheelSink";
import { useHideMouseOnType } from "./helpers/useHideMouseOnType";
import { AdminCode } from "./AdminCode/AdminCode";
import Home from "./Home";
import TextEditor from "./TextEditor";

export const EVENT_UI_READY = "lamus:uiReady";

function hideSplashScreen() {
  document.body.style.backgroundColor = "";
  const splashScreen = document.getElementById("splash");
  if (!splashScreen) return;
  splashScreen.style.animation =
    "1s splash-bkg-animate-out 0s 1 ease-in normal both";
  setTimeout(() => {
    document.body.removeChild(splashScreen);
  }, 1100);
}

export function App() {
  useHideMouseOnType();
  useMouseWheelSink();
  const keyboardHandler = useKeyboardHandler();

  useEffect(() => {
    console.log(AppStore.deviceId);
  }, []);

  const onUIReady = useCallback(() => {
    setTimeout(() => {
      hideSplashScreen();
    }, 1000);
  }, []);

  useLayoutEffect(() => {
    window.addEventListener(EVENT_UI_READY, onUIReady, { once: true });
    AppStore.login();
  }, [onUIReady]);

  const location = useLocation();

  return (
    <div className="App">
      <KeyboardHandler.Provider value={keyboardHandler}>
        <AnimatePresence>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/text" element={<TextEditor />} />
            <Route path="*" element={<Navigate to={"/"} />} />
          </Routes>
        </AnimatePresence>
        <AdminCode />
      </KeyboardHandler.Provider>
    </div>
  );
}
