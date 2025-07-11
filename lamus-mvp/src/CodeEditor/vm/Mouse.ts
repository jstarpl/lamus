import { Console, IPointer } from "@lamus/qbasic-vm";

export class Mouse implements IPointer {
  mouseX: number = 0;
  mouseY: number = 0;
  mouseButton: number = 0;
  touchInfo: {
    touchId: number;
    targetX: number;
    targetY: number;
  } | null = null;

  private consoleWidth: number = 0;
  private consoleHeight: number = 0;
  private zoom: number = 0;

  constructor(private cns: Console) {
    this.cns.container.addEventListener("mousemove", this.handleMouseEvent);
    this.cns.container.addEventListener("mousedown", this.handleMouseEvent);
    this.cns.container.addEventListener("mouseup", this.handleMouseEvent);
    this.cns.container.addEventListener("contextmenu", this.handleContextMenu);

    this.cns.container.addEventListener("touchmove", this.handleTouchEvent);
    this.cns.container.addEventListener(
      "touchstart",
      this.handleTouchStartEvent
    );
    this.cns.container.addEventListener("touchend", this.handleTouchEndEvent);
    this.cns.container.addEventListener(
      "touchcancel",
      this.handleTouchEndEvent
    );

    this.handleResize();

    this.cns.addEventListener("resize", this.handleResize);
    window.addEventListener("resize", this.handleResize);
  }

  private handleResize = () => {
    this.consoleWidth = this.cns.container.clientWidth;
    this.consoleHeight = this.cns.container.clientHeight;
    const containerStyleMap = this.cns.container.computedStyleMap();
    this.zoom = Number(containerStyleMap.get("--output-zoom")) || 1;
  };

  private handleMouseEvent = (e: MouseEvent) => {
    this.mouseX = Math.max(
      0,
      Math.floor(((e.offsetX / this.consoleWidth) * this.cns.width) / this.zoom)
    );
    this.mouseY = Math.max(
      0,
      Math.floor(
        ((e.offsetY / this.consoleHeight) * this.cns.height) / this.zoom
      )
    );
    this.mouseButton = e.buttons;
  };

  private handleTouchStartEvent = (e: TouchEvent) => {
    if (this.touchInfo?.touchId !== undefined) return;
    if (!(e.target instanceof HTMLElement)) return;
    const { x, y } = e.target.getBoundingClientRect();
    this.touchInfo = {
      touchId: e.changedTouches[0].identifier,
      targetX: x,
      targetY: y,
    };
    this.handleTouchEvent(e);
    this.mouseButton = 1;
  };

  private handleTouchEndEvent = (e: TouchEvent) => {
    if (this.touchInfo?.touchId !== e.changedTouches[0].identifier) return;
    this.handleTouchEvent(e);
    this.touchInfo = null;
    this.mouseButton = 0;
  };

  private handleTouchEvent = (e: TouchEvent) => {
    if (this.touchInfo?.touchId !== e.changedTouches[0].identifier) return;
    const offsetX = e.changedTouches[0].clientX - this.touchInfo.targetX;
    const offsetY = e.changedTouches[0].clientY - this.touchInfo.targetY;
    this.mouseX = Math.min(
      Math.max(
        0,
        Math.floor(((offsetX / this.consoleWidth) * this.cns.width) / this.zoom)
      ),
      this.cns.width
    );
    this.mouseY = Math.min(
      Math.max(
        0,
        Math.floor(
          ((offsetY / this.consoleHeight) * this.cns.height) / this.zoom
        )
      ),
      this.cns.height
    );
  };

  private handleContextMenu = (e: Event) => {
    e.preventDefault();
  };
}
