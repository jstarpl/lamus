import { useLayoutEffect } from "react";

const CURSOR_KEYS = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"];

enum Direction {
  Up = "up",
  Down = "down",
  Left = "left",
  Right = "right",
}

function getDirectionFromCode(code: string): Direction {
  switch (code) {
    case "ArrowUp":
      return Direction.Up;
    case "ArrowDown":
      return Direction.Down;
    case "ArrowLeft":
      return Direction.Left;
    case "ArrowRight":
      return Direction.Right;
  }

  return Direction.Down;
}

type ElementAndRect = {
  element: HTMLElement;
  rect: DOMRect;
};

function getBoundingClientRectsForNodeList(
  list: NodeListOf<HTMLElement>
): ElementAndRect[] {
  const focusableElementsRects: Array<{
    element: HTMLElement;
    rect: DOMRect;
  }> = [];
  list.forEach((element) => {
    focusableElementsRects.push({
      element,
      rect: element.getBoundingClientRect(),
    });
  });

  return focusableElementsRects;
}

function findClosestElementInDirection(
  rect: DOMRect,
  direction: Direction,
  list: ElementAndRect[]
): HTMLElement | null {
  let sortedOptions;
  switch (direction) {
    case Direction.Up:
      sortedOptions = list
        .filter((item) => Math.floor(item.rect.top) <= Math.floor(rect.top))
        .map((item) => ({
          element: item.element,
          distance: Math.sqrt(
            Math.pow(Math.abs(rect.top - item.rect.top), 2) +
              Math.pow(
                Math.min(
                  Math.abs(rect.left - item.rect.left),
                  Math.abs(rect.right - item.rect.right)
                ),
                2
              )
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
      break;
    case Direction.Down:
      sortedOptions = list
        .filter((item) => Math.floor(item.rect.top) >= Math.floor(rect.bottom))
        .map((item) => ({
          element: item.element,
          distance: Math.sqrt(
            Math.pow(Math.abs(rect.bottom - item.rect.top), 2) +
              Math.pow(
                Math.min(
                  Math.abs(rect.left - item.rect.left),
                  Math.abs(rect.right - item.rect.right)
                ),
                2
              )
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
      break;
    case Direction.Left:
      sortedOptions = list
        .filter((item) => Math.floor(item.rect.right) <= Math.floor(rect.left))
        .map((item) => ({
          element: item.element,
          distance: Math.sqrt(
            Math.pow(Math.abs(rect.left - item.rect.right), 2) +
              Math.pow(
                Math.min(
                  Math.abs(rect.top - item.rect.top),
                  Math.abs(rect.bottom - item.rect.bottom)
                ),
                2
              )
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
      break;
    case Direction.Right:
      sortedOptions = list
        .filter((item) => Math.floor(item.rect.left) >= Math.floor(rect.right))
        .map((item) => ({
          element: item.element,
          distance: Math.sqrt(
            Math.pow(Math.abs(rect.right - item.rect.left), 2) +
              Math.pow(
                Math.min(
                  Math.abs(rect.top - item.rect.top),
                  Math.abs(rect.bottom - item.rect.bottom)
                ),
                2
              )
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
      break;
  }
  return sortedOptions?.[0]?.element ?? null;
}

export function useCursorNavigation(
  parentEl?: React.RefObject<HTMLElement>,
  enable: boolean = true
) {
  useLayoutEffect(() => {
    if (!enable) return;

    const target = parentEl?.current ?? window;

    function onKeyDown(e: KeyboardEvent) {
      const focusedElement = document.querySelector(":focus") as HTMLElement;

      if (
        !CURSOR_KEYS.includes(e.key) ||
        e.ctrlKey ||
        e.shiftKey ||
        e.metaKey ||
        e.altKey
      )
        return;

      if (focusedElement?.dataset["ownCursorNavigation"]) return;
      if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        focusedElement?.nodeName === "INPUT" &&
        [
          "text",
          "password",
          "url",
          "email",
          "date",
          "datetime-local",
          "month",
          "week",
          "number",
          "tel",
          "time",
        ].includes(focusedElement.getAttribute("type") ?? "")
      )
        return;

      e.preventDefault();
      e.stopPropagation();

      const root = parentEl?.current ?? document;

      const isDialogOpen = !!root.querySelector(
        "dialog[open], .Dialog[data-open]"
      );
      const focusableSelector = isDialogOpen
        ? // if a Dialog is open, limit the focusable elements to only the ones in the open dialog
          'dialog[open] button:not([tabindex="-1"]), dialog[open] input:not([tabindex="-1"]), dialog[open] [tabindex]:not([tabindex="-1"]), ' +
          '.Dialog[data-open] button:not([tabindex="-1"]), .Dialog[data-open] input:not([tabindex="-1"]), .Dialog[data-open] [tabindex]:not([tabindex="-1"])'
        : // no Dialog open, we can look at all the elements
          'button:not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

      const focusableElements = root.querySelectorAll(
        focusableSelector
      ) as NodeListOf<HTMLElement>;

      if (focusableElements.length === 0) return;

      if (!focusedElement && focusableElements[0]) {
        focusableElements[0].focus();
        return;
      }

      const direction = getDirectionFromCode(e.key);

      const focusedElementRect = focusedElement.getBoundingClientRect();
      const focusableElementsRects = getBoundingClientRectsForNodeList(
        focusableElements
      ).filter((elementAndRect) => elementAndRect.element !== focusedElement);
      const targetElement = findClosestElementInDirection(
        focusedElementRect,
        direction,
        focusableElementsRects
      );

      if (!targetElement) return;
      targetElement.focus();
    }

    target.addEventListener("keydown", onKeyDown as EventListener, {
      passive: false,
      capture: false,
    });

    return () => {
      target.removeEventListener("keydown", onKeyDown as EventListener, {
        capture: false,
      });
    };
  }, [parentEl, enable]);
}
