import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import data from "@emoji-mart/data";
import { Picker } from "emoji-mart";
import "./EmojiPicker.css";

type DOMPosition = { x: number; y: number; lineHeight: string };

export const EMOJI_PICKER_NODE_NAME = "EM-EMOJI-PICKER";

export function InnerEmojiPicker({
  position,
  onEmojiSelect,
}: {
  position: DOMPosition | null;
  onEmojiSelect: (props: { native: string }) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const focusEmojiSearchInput = useCallback(() => {
    lastFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const webComponent = document.querySelector(
      EMOJI_PICKER_NODE_NAME.toLowerCase()
    ) as HTMLElement;

    const shadowRoot = webComponent?.shadowRoot;
    if (!shadowRoot) return;
    const searchInput = shadowRoot.querySelector(
      "input[type=search]"
    ) as HTMLElement;
    if (!searchInput) return;
    searchInput?.focus();

    setTimeout(() => {
      webComponent.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }, 80);
  }, []);

  useEffect(() => {
    if (mounted) return;
    new Picker({
      data,
      ref,
      native: true,
      showPreview: false,
      previewPosition: "none",
      onEmojiSelect,
    } as any);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, onEmojiSelect]);

  useEffect(() => {
    const hostElement = ref.current;
    const webComponent = hostElement?.querySelector(
      EMOJI_PICKER_NODE_NAME.toLowerCase()
    );
    const shadowRoot = webComponent?.shadowRoot;
    if (!shadowRoot) return;

    const style = document.createElement("style");
    style.textContent = `
    :host {
      border: 1px solid #e8e8eb;
    }
    .search input[type=search] {
      border: 1px solid rgba(226,226,229,.2)
    }
    `;

    shadowRoot.appendChild(style);
  }, []);

  useLayoutEffect(() => {
    const timeout = setTimeout(() => {
      focusEmojiSearchInput();
    }, 40);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      id="emoji-picker"
      style={{
        position: "absolute",
        display: "block", // Temporary
        top: `${position?.y}px`,
        left: `${position?.x}px`,
        marginTop: `${position?.lineHeight}`,
        zIndex: 2,
      }}
      ref={ref}
    />
  );
}
