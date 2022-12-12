import { uniq, isEqual } from "lodash";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { assertNever, isOrIsAncestorOf } from "../../helpers/util";
import "./ListView.css";

type TargetValue = { value: string[] };
export type ListViewChangeEvent = CustomEvent<TargetValue>;

interface IProps {
  children?: JSX.Element[] | JSX.Element;
  multiple?: boolean;
  value?: string[];
  initialValue?: string[];
  onChange?: (e: ListViewChangeEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
}

export enum SelectedState {
  First = "first",
  Middle = "middle",
  Last = "last",
  Only = "only",
}

enum SelectionDistance {
  Near = 1,
  Far = 2,
  End = 3,
}

export const SelectedContext = React.createContext<false | SelectedState>(
  false
);

export const ListViewList = function ListViewList({
  children,
  multiple,
  value,
  initialValue,
  onChange,
  onFocus,
  onBlur,
}: IProps) {
  const [isControlled] = useState(value !== undefined);
  const [localValue, setLocalValue] = useState(initialValue ?? []);
  const listEl = useRef<HTMLUListElement>(null);
  const startIndex = useRef<number | undefined>(undefined);
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
  children = Array.isArray(children)
    ? children
    : children !== undefined
    ? [children]
    : [];
  const decoratedChildrenNodes =
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
    const elem = listEl.current;

    function onKeyDown(e: KeyboardEvent) {
      ctrlState.current = e.ctrlKey;
      shiftState.current = e.shiftKey;
      const allItems = elem.querySelectorAll(
        ":scope > .list-view-item"
      ) as NodeListOf<HTMLElement>;
      const currentFocus = elem.querySelector(
        ":scope > .list-view-item:focus"
      ) as HTMLElement;
      if (allItems.length === 0) return;

      let currentFocusIndex = -1;
      if (currentFocus) {
        currentFocusIndex = Array.from(allItems).indexOf(currentFocus);
      }
      let direction = 0;
      let distance: SelectionDistance = SelectionDistance.Near;
      switch (e.key) {
        case "ArrowUp":
          direction = -1;
          break;
        case "ArrowDown":
          direction = 1;
          break;
        case "Home":
          direction = -1;
          distance = SelectionDistance.End;
          break;
        case "End":
          direction = 1;
          distance = SelectionDistance.End;
          break;
        case "PageUp":
          direction = -1;
          distance = SelectionDistance.Far;
          break;
        case "PageDown":
          direction = 1;
          distance = SelectionDistance.Far;
          break;
      }
      if (direction === 0) return;

      let newFocusIndex = 0;

      if (currentFocusIndex >= 0) {
        switch (distance) {
          case SelectionDistance.Near:
            newFocusIndex = Math.min(
              Math.max(0, currentFocusIndex + direction),
              allItems.length - 1
            );
            break;
          case SelectionDistance.Far:
            const elementHeight = allItems[0].clientHeight;
            const listHeight = elem.offsetHeight;
            const pageSize = Math.floor(listHeight / elementHeight);
            newFocusIndex = Math.min(
              Math.max(0, currentFocusIndex + direction * pageSize),
              allItems.length - 1
            );
            break;
          case SelectionDistance.End:
            newFocusIndex = direction < 0 ? 0 : allItems.length - 1;
            break;
          default:
            assertNever(distance);
            break;
        }
      } else if (startIndex.current !== undefined) {
        newFocusIndex = Math.min(startIndex.current, allItems.length - 1);
      }

      const newFocus = allItems.item(newFocusIndex);
      if (!newFocus) return;
      inKeyboardEvent.current = direction;
      newFocus.focus();
      inKeyboardEvent.current = false;
      newFocus.dispatchEvent(
        new FocusEvent("focusin", {
          bubbles: true,
        })
      );
      e.preventDefault();
    }

    function onPointerDown(e: PointerEvent) {
      inPointerEvent.current = true;
      ctrlState.current = e.ctrlKey;
      shiftState.current = e.shiftKey;
    }

    function onPointerUp(e: PointerEvent) {
      inPointerEvent.current = false;
      ctrlState.current = e.ctrlKey;
      shiftState.current = e.shiftKey;
    }

    elem.addEventListener("keydown", onKeyDown);
    elem.addEventListener("pointerdown", onPointerDown);
    elem.addEventListener("pointerup", onPointerUp);

    return () => {
      elem.removeEventListener("keydown", onKeyDown);
      elem.removeEventListener("pointerdown", onPointerDown);
      elem.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  useLayoutEffect(() => {
    if (!listEl.current) return;
    const elem = listEl.current;

    function onFocusIn(e: FocusEvent) {
      if (!(e.target instanceof HTMLElement)) return;
      if (!e.target.dataset["value"]) return;

      const itemValue = e.target.dataset["value"];

      const allItems = elem.querySelectorAll(
        ":scope > .list-view-item"
      ) as NodeListOf<HTMLElement>;
      const thisIndex = Array.from(allItems).indexOf(e.target);

      let newValue = testedValue;
      if (multiple && ctrlState.current) {
        if (!inPointerEvent.current && !shiftState.current) return;
        if (testedValue.includes(itemValue)) {
          newValue = testedValue.filter((value) => value !== itemValue);
        } else {
          newValue = [...testedValue, itemValue];
        }
        startIndex.current = thisIndex;
      } else if (multiple && shiftState.current) {
        // TODO: Select all between lastIndex and thisIndex
        if (startIndex.current !== undefined) {
          let newSelected: string[] = [];
          const start = Math.min(startIndex.current, thisIndex);
          const end = Math.max(startIndex.current, thisIndex);
          for (let i = start; i <= end; i++) {
            const midItemValue = allItems.item(i).dataset["value"];
            if (!midItemValue) continue;
            newSelected.push(midItemValue);
          }
          newValue = [...newSelected];
        } else {
          newValue = [...testedValue, itemValue];
        }
      } else {
        newValue = [itemValue];
        startIndex.current = thisIndex;
      }

      newValue = uniq(newValue);

      if (onChange && !isEqual(value, newValue)) {
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

    elem.addEventListener("focusin", onFocusIn);

    return () => {
      elem.removeEventListener("focusin", onFocusIn);
    };
  }, [isControlled, testedValue, value, multiple, onChange]);

  useLayoutEffect(() => {
    if (!listEl.current) return;
    const elem = listEl.current;

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

      newValue = uniq(newValue);

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

    elem.addEventListener("keydown", onKeyDown);

    return () => {
      elem.removeEventListener("keydown", onKeyDown);
    };
  }, [testedValue, isControlled, onChange]);

  useLayoutEffect(() => {
    if (!listEl.current) return;
    const elem = listEl.current;

    function onLocalFocus(e: FocusEvent) {
      onFocus && onFocus(e);
    }

    function onLocalBlur(e: FocusEvent) {
      if (
        e.relatedTarget === null ||
        (e.relatedTarget instanceof HTMLElement &&
          !isOrIsAncestorOf(elem, e.relatedTarget))
      )
        onBlur && onBlur(e);
    }

    elem.addEventListener("focusin", onLocalFocus);
    elem.addEventListener("focusout", onLocalBlur);

    return () => {
      elem.removeEventListener("focusin", onLocalFocus);
      elem.removeEventListener("focusout", onLocalBlur);
    };
  }, [onFocus, onBlur]);

  return (
    <ul
      ref={listEl}
      className="list-view"
      aria-multiselectable={multiple}
      data-own-cursor-navigation
      data-own-focus
      role="listbox"
      tabIndex={0}
    >
      {decoratedChildrenNodes}
    </ul>
  );
};
