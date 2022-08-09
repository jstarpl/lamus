import React, { useCallback, useEffect, useLayoutEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";
import "./App.css";
import {
  KeyboardHandler,
  useGlobalKeyboardHandler,
} from "./helpers/useKeyboardHandler";
import { AppStore } from "./stores/AppStore";
import { useMouseWheelSink } from "./helpers/useMouseWheelSink";
import { useHideMouseOnType } from "./helpers/useHideMouseOnType";
import { AdminCode } from "./AdminCode/AdminCode";
import Home from "./Home";
import TextEditor from "./TextEditor";
import { SoundEffectsContextProvider } from "./helpers/SoundEffects";
import { autorun } from "mobx";

function removeSplashScreen() {
  const splashScreen = document.getElementById("splash");
  if (!splashScreen) return;
  document.body.removeChild(splashScreen);
}

function hideSplashScreen() {
  console.log("Hide splash screen");
  const splashScreen = document.getElementById("splash");
  const audioLogo = document.getElementById(
    "audioSplash"
  ) as HTMLAudioElement | null;
  if (!splashScreen) return;

  document.body.style.backgroundColor = "";
  splashScreen.style.animation =
    "1s splash-bkg-animate-out 0s 1 ease-in normal both";
  const animationFinished = new Promise<void>((resolve) => {
    splashScreen.addEventListener("animationend", () => {
      resolve();
    });
  });
  const audioFinished = new Promise<void>((resolve) => {
    if (!audioLogo) {
      resolve();
      return;
    }
    audioLogo.play().catch(() => resolve());
    audioLogo.addEventListener("ended", () => resolve());
  });
  Promise.all([animationFinished, audioFinished])
    .then(removeSplashScreen)
    .catch(removeSplashScreen);
}

export function App() {
  useHideMouseOnType(true);
  useMouseWheelSink();
  const keyboardHandler = useGlobalKeyboardHandler();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(AppStore.deviceId);
  }, []);

  const onUIReady = useCallback(() => {
    setTimeout(() => {
      hideSplashScreen();
    }, 1000);
  }, []);

  useLayoutEffect(
    () =>
      autorun(() => {
        if (!AppStore.isUiReady) return;
        onUIReady();
      }),
    [onUIReady]
  );

  useLayoutEffect(() => {
    AppStore.login();
  }, []);

  useEffect(() => {
    if (!keyboardHandler) return;
    function goHome(e: KeyboardEvent) {
      navigate("/");
      e.preventDefault();
    }
    keyboardHandler.bind("Accel+F10", goHome, {
      preventDefaultPartials: true,
      global: true,
      exclusive: true,
      modifiersPoisonChord: true,
      preventDefaultDown: true,
    });

    return () => {
      keyboardHandler.unbind("Accel+F10", goHome);
    };
  }, [keyboardHandler, navigate]);

  const location = useLocation();

  return (
    <div className="App">
      <MotionConfig reducedMotion="user">
        <SoundEffectsContextProvider>
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
        </SoundEffectsContextProvider>
      </MotionConfig>
    </div>
  );
}
