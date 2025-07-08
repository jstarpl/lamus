import { Console, IPointer } from "@lamus/qbasic-vm"

export class Mouse implements IPointer {
	mouseX: number = 0
	mouseY: number = 0
	mouseButton: number = 0

  private consoleWidth: number = 0
  private consoleHeight: number = 0
  private zoom: number = 0

	constructor(private cns: Console) {
		this.cns.container.addEventListener('pointermove', this.handlePointerEvent)
    this.cns.container.addEventListener('pointerdown', this.handlePointerEvent)
    this.cns.container.addEventListener('pointerup', this.handlePointerEvent)
    this.cns.container.addEventListener('mouseup', this.handleMouseUpCapture, { capture: true })
    this.cns.container.addEventListener('contextmenu', this.handleContextMenu)

    this.handleResize()

    this.cns.addEventListener('resize', this.handleResize)
		window.addEventListener('resize', this.handleResize)
	}

  private handleResize = () => {
    this.consoleWidth = this.cns.container.clientWidth
		this.consoleHeight = this.cns.container.clientHeight
    const containerStyleMap = this.cns.container.computedStyleMap()
    this.zoom = Number(containerStyleMap.get('--output-zoom')) || 1
  }

  private handlePointerEvent = (e: PointerEvent) => {
    this.mouseX = Math.max(0, Math.floor(e.offsetX / this.consoleWidth * this.cns.width / this.zoom))
		this.mouseY = Math.max(0, Math.floor(e.offsetY / this.consoleHeight * this.cns.height / this.zoom))
		this.mouseButton = e.buttons
    e.preventDefault()
  }

  private handleMouseUpCapture = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  }

  private handleContextMenu = (e: Event) => {
    e.preventDefault()
  }
}
