import { AnimatePresence, MotionConfig } from "framer-motion";
import { autorun } from "mobx";
import { useCallback, useEffect, useLayoutEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AdminCode } from "./AdminCode/AdminCode";
import "./App.css";
import CodeEditor from "./CodeEditor";
import CodeIOOAuth2 from "./CodeEditor/vm/GeneralIO/OAuth2/code";
import FileManager from "./FileManager";
import Home from "./Home";
import TextEditor from "./TextEditor";
import { GlobalSpinner } from "./components/GlobalSpinner/GlobalSpinner";
import { SoundEffectsContextProvider } from "./helpers/SoundEffects";
import { useHideMouseOnType } from "./helpers/useHideMouseOnType";
import {
  KeyboardHandler,
  useGlobalKeyboardHandler,
} from "./helpers/useKeyboardHandler";
import { ModalDialogContextProvider } from "./helpers/useModalDialog";
import { useMouseWheelSink } from "./helpers/useMouseWheelSink";
import { AppStore } from "./stores/AppStore";

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
  splashScreen.style.pointerEvents = 'none';
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
            <ModalDialogContextProvider>
              <AnimatePresence>
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<Home />} />
                  <Route path="/text" element={<TextEditor />} />
                  <Route path="/internal/io">
                    <Route path="oauth2" element={<CodeIOOAuth2 />} />
                  </Route>
                  <Route path="/code" element={<CodeEditor />} />
                  <Route path="/files" element={<FileManager />} />
                  <Route path="*" element={<Navigate to={"/"} />} />
                </Routes>
              </AnimatePresence>
              <AdminCode />
              <GlobalSpinner />
            </ModalDialogContextProvider>
          </KeyboardHandler.Provider>
        </SoundEffectsContextProvider>
      </MotionConfig>
    </div>
  );
}
