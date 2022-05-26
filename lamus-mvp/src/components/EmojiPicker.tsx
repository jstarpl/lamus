import React, { useEffect, useRef, useState } from "react";

import data from "@emoji-mart/data";
import { Picker, PickerProps } from "emoji-mart";
import "./EmojiPicker.css";

export function EmojiPicker(props: PickerProps) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mounted) return;
    new Picker({
      ...props,
      data,
      ref,
      native: true,
      showPreview: false,
      previewPosition: "none",
      onEmojiSelect: console.log,
    } as any);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    const hostElement = ref.current;
    const webComponent = hostElement?.querySelector("em-emoji-picker");
    const shadowRoot = webComponent?.shadowRoot;
    if (!shadowRoot) {
      return;
    }

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

  return (
    <div
      id="emoji-picker"
      style={{
        position: "absolute",
        display: "none", // Temporary
        top: 0,
        left: 0,
        zIndex: 2,
      }}
      ref={ref}
    />
  );
}
