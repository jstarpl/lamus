import React, { useCallback, useMemo, useRef } from "react";
import Abstract1 from "./Abstract1.wav";
import Abstract2 from "./Abstract2.wav";
import Modern1 from "./Modern1.wav";
import Modern2 from "./Modern2.wav";
import Modern3 from "./Modern3.wav";
import Modern4 from "./Modern4.wav";
import Modern5 from "./Modern5.wav";
import Modern6 from "./Modern6.wav";
import Modern7 from "./Modern7.wav";
import Modern8 from "./Modern8.wav";
import Modern9 from "./Modern9.wav";
import Modern10 from "./Modern10.wav";
import Modern11 from "./Modern11.wav";
import Modern12 from "./Modern12.wav";
import Modern13 from "./Modern13.wav";
import Modern14 from "./Modern14.wav";
import Modern15 from "./Modern15.wav";
import Modern16 from "./Modern16.wav";

type PlayEffectHandler = (effectId: number) => void;
type GetAllAudioElementsHandler = () => HTMLAudioElement[];

interface ISoundEffectsContext {
  playEffect: PlayEffectHandler;
  getAllAudioElements: GetAllAudioElementsHandler;
}

export const SoundEffectsContext = React.createContext<ISoundEffectsContext>({
  playEffect: () => {},
  getAllAudioElements: () => [],
});

const NO_DISPLAY: React.CSSProperties = {
  display: "none",
};

const SOUND_EFFECTS = [
  Abstract1,
  Abstract2,
  Modern1,
  Modern2,
  Modern3,
  Modern4,
  Modern5,
  Modern6,
  Modern7,
  Modern8,
  Modern9,
  Modern10,
  Modern11,
  Modern12,
  Modern13,
  Modern14,
  Modern15,
  Modern16,
];

export function SoundEffectsContextProvider({
  children,
}: React.PropsWithChildren<{}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nowPlaying = useRef<HTMLAudioElement | null>(null);
  const allSoundEffects = useMemo(
    () =>
      SOUND_EFFECTS.map((url) => (
        <audio
          key={url}
          src={url}
          autoPlay={false}
          controls={false}
          crossOrigin="anonymous"
          // @ts-expect-error T2322 disableremoteplayback is not in DOM lib yet
          disableRemotePlayback
          loop={false}
        />
      )),
    []
  );

  const playEffect = useCallback((effectId: number) => {
    const hasSplashScreen = !!document.getElementById("splash");
    if (hasSplashScreen) return;
    if (!containerRef.current) return;
    if (nowPlaying.current) return;

    const container = containerRef.current;
    const sfx = container.children[effectId];
    if (!sfx) throw new Error(`Unknown sound effect id: ${effectId}`);
    if (!(sfx instanceof HTMLAudioElement))
      throw new Error(`Unexpected element: ${sfx}`);

    sfx.currentTime = 0;
    sfx.volume = 0.5;
    sfx.play().catch(console.log);
    sfx.addEventListener("ended", () => {
      nowPlaying.current = null;
    });
    nowPlaying.current = sfx;
  }, []);

  const getAllAudioElements = useCallback(() => {
    if (!containerRef.current) return [] as HTMLAudioElement[];

    return Array.from(containerRef.current.querySelectorAll("audio"));
  }, []);

  const context = useMemo(
    () => ({
      playEffect,
      getAllAudioElements,
    }),
    [playEffect, getAllAudioElements]
  );

  return (
    <>
      <div style={NO_DISPLAY} ref={containerRef}>
        {allSoundEffects}
      </div>
      <SoundEffectsContext.Provider value={context}>
        {children}
      </SoundEffectsContext.Provider>
    </>
  );
}

export const SoundEffectsConsumer = SoundEffectsContext.Consumer;
