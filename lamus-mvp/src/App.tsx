import React, { useCallback, useEffect } from "react";
import "./App.css";
import { KeyboardHandler } from "./KeyboardHandler";
import { MouseHandler } from "./MouseHandler";
import { AppStore } from "./stores/AppStore";
import { HideMouseOnType } from "./helpers/HideMouseOnType";
import { AdminCode } from "./AdminCode/AdminCode";
import { TextEditor } from "./TextEditor/TextEditor";

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
  useEffect(() => {
    console.log(AppStore.deviceId);
  }, []);

  const onUIReady = useCallback((instance: any) => {
    setTimeout(() => {
      hideSplashScreen();
    }, 1000);
  }, []);

  useEffect(() => {
    window.addEventListener(EVENT_UI_READY, onUIReady, { once: true });
    AppStore.login();
  }, [onUIReady]);

  return (
    <div className="App">
      <KeyboardHandler />
      <MouseHandler />
      <HideMouseOnType defaultCursorVisible={false} />
      <AdminCode />
      <TextEditor />
    </div>
  );
}
