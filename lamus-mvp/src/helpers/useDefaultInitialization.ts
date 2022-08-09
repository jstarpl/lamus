import { useEffect } from "react";
import { AppStore } from "../stores/AppStore";

export function useDefaultInitialization() {
  useEffect(() => {
    AppStore.setUIReady();
  }, []);
}
