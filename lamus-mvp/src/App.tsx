import React, { useCallback, useEffect, useLayoutEffect } from "react";
import "./App.css";
import {
  KeyboardHandler,
  useKeyboardHandler,
} from "./helpers/useKeyboardHandler";
import { useMouseWheelSink } from "./helpers/useMouseWheelSink";
import { AppStore } from "./stores/AppStore";
import { useHideMouseOnType } from "./helpers/useHideMouseOnType";
import { AdminCode } from "./AdminCode/AdminCode";
import { TextEditor } from "./TextEditor/TextEditor";
import { EmojiPicker } from "./components/EmojiPicker";

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

  return (
    <div className="App">
      <KeyboardHandler.Provider value={keyboardHandler}>
        <AdminCode />
        <TextEditor />
        <EmojiPicker />
      </KeyboardHandler.Provider>
    </div>
  );
}
