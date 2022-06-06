import { useEffect } from "react";
import { EVENT_UI_READY } from "../App";

export function useDefaultInitialization() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(EVENT_UI_READY));
  }, []);
}
