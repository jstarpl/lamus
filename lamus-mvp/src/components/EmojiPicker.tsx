import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import data from "@emoji-mart/data";
import { Picker, PickerProps } from "emoji-mart";
import "./EmojiPicker.css";

function getLineHeight(element: HTMLElement): string {
  const style = window.getComputedStyle(element);
  const paddingTop = style.getPropertyValue("padding-top");
  const lineHeight = style.getPropertyValue("line-height");
  return `calc(${paddingTop} + ${lineHeight})`;
}

type DOMPosition = { x: number; y: number; lineHeight: string };

function getCaretPosition(): DOMPosition {
  const selection = window.getSelection();
  if (!selection || selection?.rangeCount === 0)
    return { x: 0, y: 0, lineHeight: "1em" };
  if (selection.anchorNode instanceof HTMLElement) {
    const rect = selection.anchorNode.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      lineHeight: getLineHeight(selection.anchorNode),
    };
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    lineHeight:
      selection.anchorNode && selection.anchorNode.parentElement
        ? getLineHeight(selection.anchorNode.parentElement)
        : "1em",
  };
}

export function EmojiPicker(props: PickerProps) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const [isOpen, setOpen] = useState(false);
  const [position, setPosition] = useState<DOMPosition | null>(null);

  const onEmojiSelect = useCallback((emoji: { native: string }) => {
    console.log(emoji);
    if (!lastFocus.current) return;
    lastFocus.current.focus();

    const selection = window.getSelection();
    const node = selection?.focusNode;
    if (!node) return;
    const textContent = node.textContent ?? "";
    const offset = selection.focusOffset;
    node.textContent =
      textContent.substring(0, offset) +
      emoji.native +
      textContent.substring(offset);

    selection.removeAllRanges();
    const restoredRange = new Range();
    restoredRange.setStart(node, offset + emoji.native.length);
    selection.addRange(restoredRange);
  }, []);

  useEffect(() => {
    if (mounted) return;
    new Picker({
      ...props,
      data,
      ref,
      native: true,
      showPreview: false,
      previewPosition: "none",
      onEmojiSelect,
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

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "." && e.metaKey && !e.ctrlKey) {
        const position = getCaretPosition();
        setPosition({
          x: position.x + window.scrollX,
          y: position.y + window.scrollY,
          lineHeight: position.lineHeight,
        });
        setOpen(true);
        e.preventDefault();
      } else if (
        isOpen &&
        e.key === "Escape" &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        setOpen(false);
        e.preventDefault();
      }
    },
    [isOpen]
  );

  useEffect(() => {
    window.addEventListener("input", console.log);
    window.addEventListener("keydown", onKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const timeout = setTimeout(() => {
      lastFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const picker = document.querySelector("em-emoji-picker") as HTMLElement;
      picker?.focus();
    }, 40);

    return () => {
      clearTimeout(timeout);
    };
  }, [isOpen]);

  return (
    <div
      id="emoji-picker"
      style={{
        position: "absolute",
        display: isOpen ? "block" : "none", // Temporary
        top: `${position?.y}px`,
        left: `${position?.x}px`,
        marginTop: `${position?.lineHeight}`,
        zIndex: 2,
      }}
      ref={ref}
    />
  );
}
