import React, { useCallback, useEffect, useRef, useState } from "react";

import "./EmojiPicker.css";
import { EMOJI_PICKER_NODE_NAME, InnerEmojiPicker } from "./InnerEmojiPicker";

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

const EMOJI_PICKER_WIDTH = 354;
const VIEWPORT_HORIZONTAL_MARGIN = 40;

export function EmojiPicker() {
  const lastFocus = useRef<HTMLElement | null>(null);
  const lastSelection = useRef<{ node: Node; focusOffset: number } | null>(
    null
  );

  const [isOpen, setOpen] = useState(false);
  const [position, setPosition] = useState<DOMPosition | null>(null);

  function restoreFocus() {
    if (!lastFocus.current) return;
    lastFocus.current.focus();
  }

  function restoreSelection() {
    if (!lastSelection.current) return;
    const { node, focusOffset } = lastSelection.current;

    let refocusNode = node;

    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    const restoredRange = new Range();
    try {
      restoredRange.setStart(refocusNode, focusOffset);
      selection.addRange(restoredRange);
    } catch (e) {
      console.error(e);
    }
  }

  const onEmojiSelect = useCallback((emoji: { native: string }) => {
    restoreFocus();

    if (!lastSelection.current) return;
    const { node, focusOffset } = lastSelection.current;
    const textContent = node.textContent ?? "";
    node.textContent =
      textContent.substring(0, focusOffset) +
      emoji.native +
      textContent.substring(focusOffset);

    let refocusNode = node;
    // If the lastSelection node wasn't a text node, then by assigning textContent, we've created a new text node
    // and we should move the caret there
    if (refocusNode.nodeName !== "#text") {
      refocusNode = refocusNode.childNodes[0];
    }

    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      const restoredRange = new Range();
      try {
        restoredRange.setStart(
          refocusNode,
          Math.min(
            refocusNode.textContent?.length ?? 0,
            focusOffset + emoji.native.length
          )
        );
        selection.addRange(restoredRange);
      } catch (e) {}
    });

    setOpen(false);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "." && e.metaKey && !e.ctrlKey) {
        const position = getCaretPosition();

        const targetY = position.y + window.scrollY;
        let targetX = position.x + window.scrollX;

        if (
          targetX + EMOJI_PICKER_WIDTH >
          window.innerWidth - VIEWPORT_HORIZONTAL_MARGIN
        ) {
          targetX =
            window.innerWidth - VIEWPORT_HORIZONTAL_MARGIN - EMOJI_PICKER_WIDTH;
        }

        setPosition({
          x: targetX,
          y: targetY,
          lineHeight: position.lineHeight,
        });
        lastFocus.current = document.activeElement as HTMLElement;

        const selection = window.getSelection();
        const node = selection?.focusNode;
        if (node) {
          lastSelection.current = {
            focusOffset: selection.focusOffset,
            node: node,
          };
        } else {
          lastSelection.current = null;
        }

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

        if (!lastFocus.current) return;
        lastFocus.current.focus();

        if (lastSelection.current?.node.nodeName !== "#text") return;

        restoreSelection();
      } else if (
        isOpen &&
        document.activeElement?.nodeName !== EMOJI_PICKER_NODE_NAME
      ) {
        setOpen(false);
      }
    },
    [isOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [onKeyDown]);

  useEffect(() => {
    if (!isOpen) return;

    function onClick(e: MouseEvent) {
      if (
        e.target instanceof Element &&
        e.target.nodeName !== EMOJI_PICKER_NODE_NAME
      ) {
        setOpen(false);
      }
    }

    window.addEventListener("click", onClick, { capture: true });

    return () => {
      window.removeEventListener("click", onClick, { capture: true });
    };
  }, [isOpen]);

  return isOpen ? (
    <InnerEmojiPicker onEmojiSelect={onEmojiSelect} position={position} />
  ) : null;
}
