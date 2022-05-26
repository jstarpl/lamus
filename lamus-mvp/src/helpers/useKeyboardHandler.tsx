import { useEffect, useState } from "react";
import sorensen from "@sofie-automation/sorensen";
import { AppStore } from "../stores/AppStore";
import React from "react";

function sorensenInitialized(): boolean {
  return document.body.dataset["sorensen"] !== undefined;
}

const PREVENT_KEYS = [
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
  "BrowserBack",
  "BrowserHome",
  "BrowserSearch",
  "BrowserFavorites",
  "BrowserRefresh",
  "BrowserForward",
  "LaunchApp1",
  "LaunchMail",
];

export const KeyboardHandler = React.createContext<typeof sorensen | null>(
  null
);

export function useKeyboardHandler(): typeof sorensen | null {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!sorensenInitialized()) {
      sorensen.init().then(() => setInitialized(true));
    } else {
      document.body.dataset.sorensen = "initialized";
      setInitialized(true);
    }

    return () => {};
  }, []);

  useEffect(() => {
    if (!initialized) return;

    function preventDefault(e: KeyboardEvent) {
      e.preventDefault();
    }

    PREVENT_KEYS.forEach((key) => {
      sorensen.bind(key, preventDefault);
    });

    return () => {
      PREVENT_KEYS.forEach((key) => {
        sorensen.unbind(key, preventDefault);
      });
    };
  }, [initialized]);

  return initialized ? sorensen : null;
}
