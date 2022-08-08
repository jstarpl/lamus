import React, { useEffect } from "react";
import { SoundEffectsContext } from ".";

export function useFocusSoundEffect(selectors?: string) {
  const sfxContext = React.useContext(SoundEffectsContext);
  useEffect(() => {
    if (!sfxContext) return;
    const sfx = sfxContext;

    function onFocus(e: FocusEvent) {
      if (
        selectors &&
        e.target instanceof HTMLElement &&
        !e.target.matches(selectors)
      ) {
        return;
      }

      sfx.playEffect(0);
    }

    window.addEventListener("focusin", onFocus);

    return () => {
      window.removeEventListener("focusin", onFocus);
    };
  }, [sfxContext, selectors]);
}
