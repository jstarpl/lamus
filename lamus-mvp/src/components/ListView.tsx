import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./ListView.css";

type TargetValue = { value: string[] };
export type ListViewChangeEvent = CustomEvent<TargetValue>;

interface IProps {
  children?: JSX.Element[];
  multiple?: boolean;
  value?: string[];
  initialValue?: string[];
  onChange?: (e: ListViewChangeEvent) => void;
}

export enum SelectedState {
  First = "first",
  Middle = "middle",
  Last = "last",
  Only = "only",
}

export const SelectedContext = React.createContext<false | SelectedState>(
  false
);

export const ListView = function ListView({
  children,
  multiple,
  value,
  initialValue,
  onChange,
}: IProps) {
  const [isControlled] = useState(value !== undefined);
  const [localValue, setLocalValue] = useState(initialValue ?? []);
  const listEl = useRef<HTMLUListElement>(null);
  const lastBlurItem = useRef<HTMLElement | undefined>(undefined);
  const ctrlState = useRef(false);
  const shiftState = useRef(false);
  const inKeyboardEvent = useRef<false | number>(false);
  const inPointerEvent = useRef(false);

  useEffect(() => {
    function onKeyDownUp(e: KeyboardEvent) {
      if (e.key === "Control") ctrlState.current = e.type === "keydown";
      if (e.key === "Shift") shiftState.current = e.type === "keydown";
    }

    window.addEventListener("keydown", onKeyDownUp, {
      capture: true,
    });
    window.addEventListener("keyup", onKeyDownUp, {
      capture: true,
    });

    return () => {
      window.removeEventListener("keydown", onKeyDownUp, {
        capture: true,
      });
      window.removeEventListener("keyup", onKeyDownUp, {
        capture: true,
      });
    };
  }, []);

  const testedValue = value ?? localValue;

  let inSequence = false;
  const childrenNodes =
    children?.map((node, index, array) => {
      const key = `${node.key}`;
      const selected = testedValue?.includes(key) ?? false;
      let selectedState = selected ? SelectedState.Middle : false;

      if (selected && !inSequence) {
        inSequence = true;
        selectedState = SelectedState.First;
      }

      if (selected && !testedValue?.includes(`${array[index + 1]?.key}`)) {
        if (selectedState === SelectedState.First) {
          selectedState = SelectedState.Only;
        } else {
          selectedState = SelectedState.Last;
        }
      }

      if (!selected) {
        inSequence = false;
      }

      return (
        <React.Fragment key={key}>
          <SelectedContext.Provider value={selectedState}>
            {node}
          </SelectedContext.Provider>
        </React.Fragment>
      );
    }) ?? null;

  useLayoutEffect(() => {
    if (!listEl.current) return;
    const el = listEl.current;

    function onKeyDown(e: KeyboardEvent) {
      const allItems = el.querySelectorAll(
        ":scope > .list-view-item"
      ) as NodeListOf<HTMLElement>;
      const currentFocus = el.querySelector(
        ":scope > .list-view-item:focus"
      ) as HTMLElement;
      let currentFocusIndex = -1;
      if (currentFocus) {
        currentFocusIndex = Array.from(allItems).indexOf(currentFocus);
      }
      let direction = 0;
      switch (e.key) {
        case "ArrowUp":
          direction = -1;
          break;
        case "ArrowDown":
          direction = 1;
          break;
      }
      if (direction === 0) return;

      const newFocusIndex = Math.min(
        Math.max(0, currentFocusIndex + direction),
        allItems.length - 1
      );

      const newFocus = allItems.item(newFocusIndex);
      if (!newFocus) return;
      console.log("before focus fire");
      inKeyboardEvent.current = direction;
      newFocus.focus({
        preventScroll: true,
      });
      inKeyboardEvent.current = false;
      console.log("after focus fire");
      newFocus.dispatchEvent(
        new FocusEvent("focusin", {
          bubbles: true,
        })
      );
      newFocus.scrollIntoView({
        behavior: "smooth",
      });
      e.preventDefault();
    }

    function onPointerDown() {
      inPointerEvent.current = true;
    }

    function onPointerUp() {
      inPointerEvent.current = false;
    }

    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);

    return () => {
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  useLayoutEffect(() => {
    if (!listEl.current) return;
    const el = listEl.current;

    function onFocusIn(e: FocusEvent) {
      if (!(e.target instanceof HTMLElement)) return;
      if (!e.target.dataset["value"]) return;
      console.log("focusin");

      const itemValue = e.target.dataset["value"];

      let newValue = testedValue;
      if (ctrlState.current) {
        if (!inPointerEvent.current && !shiftState.current) return;
        if (testedValue.includes(itemValue)) {
          newValue = testedValue.filter((value) => value !== itemValue);
        } else {
          newValue = [...testedValue, itemValue];
        }
      } else if (shiftState.current) {
        // TODO: Select all between lastIndex and thisIndex
        newValue = [...testedValue, itemValue];
      } else {
        newValue = [itemValue];
      }

      if (onChange) {
        onChange(
          new CustomEvent<TargetValue>("change", {
            detail: {
              value: newValue.slice(),
            },
          })
        );
      }
      if (!isControlled) {
        setLocalValue(newValue.slice());
      }
    }

    function onFocusOut(e: FocusEvent) {
      if (!(e.target instanceof HTMLElement)) return;
      if (!e.target.dataset["value"]) return;
      console.log("focusout");

      lastBlurItem.current = e.target;
    }

    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);

    return () => {
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
    };
  }, [isControlled, testedValue, onChange]);

  useLayoutEffect(() => {
    if (!listEl.current) return;
    const el = listEl.current;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== " " || !ctrlState.current) return;
      if (!(e.target instanceof HTMLElement)) return;
      if (!e.target.dataset["value"]) return;

      const itemValue = e.target.dataset["value"];

      let newValue = testedValue;
      if (testedValue.includes(itemValue)) {
        newValue = newValue.filter((value) => value !== itemValue);
      } else {
        newValue = [...newValue, itemValue];
      }

      if (onChange) {
        onChange(
          new CustomEvent<TargetValue>("change", {
            detail: {
              value: newValue.slice(),
            },
          })
        );
      }

      if (!isControlled) {
        setLocalValue(newValue);
      }

      e.preventDefault();
    }

    el.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("keydown", onKeyDown);
    };
  }, [testedValue, isControlled, onChange]);

  return (
    <ul
      ref={listEl}
      className="list-view"
      aria-multiselectable={multiple}
      role="listbox"
      tabIndex={0}
    >
      {childrenNodes}
    </ul>
  );
};
