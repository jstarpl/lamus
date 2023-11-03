import React, { useCallback, useEffect, useRef } from "react";
import * as classes from "./VirtualGamepad.module.css";
import { observer } from "mobx-react-lite";
import { EditorStore } from "../../../stores/EditorStore";
import { BsCircle, BsSquare, BsTriangle, BsXLg } from "react-icons/bs";

const VirtualGamepad = observer(function VirtualGamepad(): JSX.Element {
  const joystickEl = useRef<HTMLDivElement>(null);
  const joystickAreaEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!joystickEl.current || !joystickAreaEl.current) return;

    let joystickPointerIds: Set<number> = new Set();
    let joystickAreaRect: DOMRect | null = null;
    let joystickKnobRect: DOMRect | null = null;
    let pointerOffset: { top: number; left: number } | null = null;

    let joystickTranslateCap: { x: number; y: number } | null = null;

    function onJoystickPositionUpdate(x: number, y: number) {
      EditorStore.vm?.virtualGamepad?.setDPadXY(x, y);
    }

    function onJoystickRelease() {
      EditorStore.vm?.virtualGamepad?.releaseDPad();
    }

    function onJoystickReset() {
      onJoystickRelease();
      if (!joystickEl.current) return;
      joystickEl.current.style.transform = `translate(-50%, -50%) translate(0, 0)`;
    }

    function onJoystickMove(left: number, top: number) {
      if (
        !joystickEl.current ||
        !joystickAreaRect ||
        !joystickKnobRect ||
        !pointerOffset ||
        !joystickTranslateCap
      )
        return;

      let knobTranslateY =
        top -
        joystickAreaRect.top -
        joystickAreaRect.height / 2 -
        (pointerOffset.top - joystickKnobRect.height / 2);
      let knobTranslateX =
        left -
        joystickAreaRect.left -
        joystickAreaRect.width / 2 -
        (pointerOffset.left - joystickKnobRect.width / 2);

      knobTranslateX = Math.max(
        joystickTranslateCap.x * -1,
        Math.min(knobTranslateX, joystickTranslateCap.x)
      );
      knobTranslateY = Math.max(
        joystickTranslateCap.y * -1,
        Math.min(knobTranslateY, joystickTranslateCap.y)
      );

      const potX = knobTranslateX / joystickTranslateCap.x;
      const potY = knobTranslateY / joystickTranslateCap.y;

      onJoystickPositionUpdate(potX, potY);

      joystickEl.current.style.transform = `translate(-50%, -50%) translate(${knobTranslateX}px, ${knobTranslateY}px)`;
    }

    function onPointerUp(evt: PointerEvent) {
      if (!joystickPointerIds.has(evt.pointerId)) return;

      joystickPointerIds.delete(evt.pointerId);

      evt.preventDefault();

      if (joystickPointerIds.size > 0) return;
      onJoystickReset();
    }

    function onPointerDown(evt: PointerEvent) {
      if (!joystickAreaEl.current || !joystickEl.current) return;
      joystickPointerIds.add(evt.pointerId);

      joystickAreaRect = joystickAreaEl.current.getBoundingClientRect();
      joystickKnobRect = joystickEl.current.getBoundingClientRect();
      pointerOffset = { top: evt.offsetY, left: evt.offsetX };

      joystickTranslateCap = {
        x: joystickAreaRect.width / 2 - joystickKnobRect.width / 2,
        y: joystickAreaRect.height / 2 - joystickKnobRect.height / 2,
      };

      evt.preventDefault();
    }

    function onPageFocusLost() {
      joystickPointerIds.clear();
      onJoystickReset();
    }

    function onPointerLeave(evt: PointerEvent) {
      if (!joystickPointerIds.has(evt.pointerId)) return;
      joystickPointerIds.delete(evt.pointerId);
      onJoystickReset();
    }

    function onPointerMove(evt: PointerEvent) {
      if (!joystickPointerIds.has(evt.pointerId)) return;
      onJoystickMove(evt.clientX, evt.clientY);
      evt.preventDefault();
    }

    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pagehide", onPageFocusLost);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPageFocusLost);
    window.addEventListener("pointermove", onPointerMove);
    joystickEl.current.addEventListener("pointerdown", onPointerDown);

    onJoystickReset();

    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pagehide", onPageFocusLost);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPageFocusLost);
      window.removeEventListener("pointermove", onPointerMove);
      joystickEl?.current?.removeEventListener("pointerdown", onPointerDown);
    };
  }, [joystickEl, joystickAreaEl]);

  const onFireDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const fireButtonId = e.currentTarget.dataset["fireButton"];
    if (!fireButtonId) return;

    e.currentTarget.classList.add(classes.fireActive);
    EditorStore.vm?.virtualGamepad?.setFire(Number(fireButtonId) - 1, true);
  }, []);

  const onFireUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const fireButtonId = e.currentTarget.dataset["fireButton"];
    if (!fireButtonId) return;

    e.currentTarget.classList.remove(classes.fireActive);
    EditorStore.vm?.virtualGamepad?.setFire(Number(fireButtonId) - 1, false);
  }, []);

  return (
    <div className={classes.virtualGamepad}>
      <div className={classes.joystickArea} ref={joystickAreaEl}>
        <div className={classes.joystick} ref={joystickEl}></div>
      </div>
      <div className={classes.buttons}>
        <button
          tabIndex={-1}
          className={classes.fire1}
          onPointerDown={onFireDown}
          onPointerUp={onFireUp}
          data-fire-button="1"
        >
          <BsXLg />
        </button>
        <button
          tabIndex={-1}
          className={classes.fire2}
          onPointerDown={onFireDown}
          onPointerUp={onFireUp}
          data-fire-button="2"
        >
          <BsCircle />
        </button>
        <button
          tabIndex={-1}
          className={classes.fire3}
          onPointerDown={onFireDown}
          onPointerUp={onFireUp}
          data-fire-button="3"
        >
          <BsSquare />
        </button>
        <button
          tabIndex={-1}
          className={classes.fire4}
          onPointerDown={onFireDown}
          onPointerUp={onFireUp}
          data-fire-button="4"
        >
          <BsTriangle />
        </button>
      </div>
    </div>
  );
});
VirtualGamepad.displayName = "VirtualGamepad";

export default VirtualGamepad;
