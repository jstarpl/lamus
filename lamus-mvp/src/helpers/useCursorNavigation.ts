import { useEffect } from "react";

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
        .filter((item) => item.rect.top < rect.top)
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
        .filter((item) => item.rect.top >= rect.bottom)
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
        .filter((item) => item.rect.right < rect.left)
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
        .filter((item) => item.rect.left >= rect.right)
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

export function useCursorNavigation() {
  useEffect(() => {
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

      const isDialogOpen = !!document.querySelector("dialog[open]");
      const focusableSelector = isDialogOpen
        ? // if a Dialog is open, limit the focusable elements to only the ones in the open dialog
          'dialog[open] button:not([tabindex="-1"]), dialog[open] input:not([tabindex="-1"]), dialog[open] [tabindex]:not([tabindex="-1"])'
        : // no Dialog open, we can look at all the elements
          'button:not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';
      const focusableElements = document.querySelectorAll(
        focusableSelector
      ) as NodeListOf<HTMLElement>;

      if (focusableElements.length === 0) return;

      if (!focusedElement && focusableElements[0]) {
        focusableElements[0].focus();
        return;
      }

      const direction = getDirectionFromCode(e.key);

      const focusedElementRect = focusedElement.getBoundingClientRect();
      const focusableElementsRects =
        getBoundingClientRectsForNodeList(focusableElements);
      const targetElement = findClosestElementInDirection(
        focusedElementRect,
        direction,
        focusableElementsRects
      );

      if (!targetElement) return;
      targetElement.focus();
    }

    window.addEventListener("keydown", onKeyDown, {
      passive: false,
      capture: false,
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown, {
        capture: false,
      });
    };
  }, []);
}
