import { useEffect, useState } from "react";

interface IProps {
  defaultCursorVisible?: boolean;
}

const KEY_THRESHOLD = 3;

export function HideMouseOnType({ defaultCursorVisible }: IProps) {
  const [keyCounter, setKeyCounter] = useState<number | null>(null);
  const [cursorVisible, setCursorVisible] = useState(
    defaultCursorVisible ?? true
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // only count printable characters
      if (e.key.length === 1) setKeyCounter((value) => (value ?? 0) + 1);
    }
    function onMouseMove() {
      setCursorVisible(true);
      setKeyCounter(0);
    }

    window.addEventListener("keydown", onKeyDown, {
      passive: true,
    });
    window.addEventListener("mousemove", onMouseMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    document.body.style.cursor = !cursorVisible ? "none" : "";
  }, [cursorVisible]);

  const shouldShowCursor =
    keyCounter === null ? cursorVisible : keyCounter < KEY_THRESHOLD;

  useEffect(() => {
    setCursorVisible(shouldShowCursor);
  }, [shouldShowCursor]);

  return null;
}
