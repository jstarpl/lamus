/**
    Copyright 2010 Steve Hanov
	Copyright 2019 Jan Starzak

    This file is part of qbasic-vm
	File originally sourced from qb.js, also licensed under GPL v3

    qbasic-vm is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    qbasic-vm is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with qbasic-vm.  If not, see <http://www.gnu.org/licenses/>.
*/

import { IConsole } from './IConsole'
import { Sprite } from './Sprite'

export class ImageManipulator {
	image: ImageData

	constructor(imageData: ImageData) {
		this.image = imageData
	}

	public get(x: number, y: number): [number, number, number, number] {
		const pixelOffset = (this.image.width * y + x) * 4
		return [
			this.image.data[pixelOffset + 0],
			this.image.data[pixelOffset + 1],
			this.image.data[pixelOffset + 2],
			this.image.data[pixelOffset + 3],
		]
	}

	public put(x: number, y: number, r: number, g: number, b: number, a: number): void {
		const pixelOffset = (this.image.width * y + x) * 4
		this.image.data[pixelOffset + 0] = r
		this.image.data[pixelOffset + 1] = g
		this.image.data[pixelOffset + 2] = b
		this.image.data[pixelOffset + 3] = a
	}
}

const VIDEO_COLORS = [
	'#000000', // 0: Black
	'#ffffff', // 1: White
	'#c13322', // 2: Red
	'#49dce8', // 3: Cyan
	'#ba3cc0', // 4: Purple
	'#40c945', // 5: Green
	'#3826ba', // 6: Blue
	'#ddf06e', // 7: Yellow
	'#c76316', // 8: Orange
	'#794700', // 9: Brown
	'#e96758', // 10: Light Red
	'#636363', // 11: Dark grey
	'#8b8b8b', // 12: Grey
	'#82fb85', // 13: Light green
	'#7764e8', // 14: Light blue
	'#afafaf', // 15: Light grey
]

// binary mask to only select the lowest 4 bits of a color number
const VIDEO_COLORS_MASK = 15

const SPECIAL_CHARS = {
	ArrowLeft: 75,
	ArrowUp: 72,
	ArrowRight: 77,
	ArrowDown: 80,
	Home: 71,
	PageUp: 73,
	End: 79,
	PageDown: 81,
	Insert: 82,
	Delete: 83,
	Enter: 13,
	Escape: 27,
	Backspace: 8,
	Tab: 9,
}

interface IVideoMode {
	width: number
	height: number
	rows: number
	cols: number
	landscape?: boolean
}

const VIDEO_MODES: { [key: number]: IVideoMode } = {
	// Portrait low-res mode
	1: { width: 160, height: 300, rows: 37, cols: 20 },
	// Portrait high-res mode
	2: { width: 320, height: 600, rows: 75, cols: 40 },
	// Landscape low-res mode
	3: { width: 300, height: 160, rows: 20, cols: 37, landscape: true },
	// Landscape high-res mode
	4: { width: 600, height: 320, rows: 40, cols: 75, landscape: true },
	// Portrait MODE7
	7: { width: 160, height: 300, rows: 37, cols: 20 },
	// Landscape MODE7
	8: { width: 300, height: 160, rows: 20, cols: 37, landscape: true },

	// PC-compatible 80 columns mode
	10: { width: 640, height: 200, rows: 25, cols: 80, landscape: true },
}

const DEFAULT_VIDEO_MODE = 1
const SCREEN_BORDER_VARIABLE = '--qbasic-interpreter-screen-border-color'
export class Console extends EventTarget implements IConsole {
	private container: HTMLDivElement
	private canvas: HTMLCanvasElement
	private inputElement: HTMLInputElement
	private ctx: CanvasRenderingContext2D
	private charImg: HTMLImageElement
	private interval: number | undefined = undefined
	private images: Array<HTMLImageElement | undefined> = []
	private sprites: Array<Sprite | undefined> = []

	private cursorEnabled = false
	private cursorShown = false

	private gamepadEnabled = false

	private keyBuffer: number[] = []

	private hasFocus = false

	private recording: boolean
	private recorded = ''

	private fgcolorNum = 0
	private bgcolorNum = 15
	private bocolorNum = 11
	private bgcolor = VIDEO_COLORS[this.bgcolorNum]
	private fgcolor = VIDEO_COLORS[this.fgcolorNum]
	private bocolor = VIDEO_COLORS[this.bocolorNum]
	private curX = 0
	private curY = 0
	x = 0
	y = 0
	private rows = 75
	private cols = 40
	private _landscape = false
	get landscape(): boolean {
		return this._landscape
	}
	private charWidth = 8
	private charHeight = 8

	private _window: { x: number; y: number; width: number; height: number } | null = null
	private _clipDepth = 0

	// This is a map of pressed key codes and the resulting characters
	private keyDown: Map<string, string> = new Map()
	private inputMode = false
	private inputNewLineAfterEnter = false
	private inputPixelAspect = 1
	private onInputDone: ((str: string) => void) | null = null
	private onTrappedKey: {
		[key: number]: (num?: number) => void
	} = {}
	private inputStr = ''

	private _width: number = this.cols * this.charWidth
	get width(): number {
		return this._width
	}
	private _height: number = this.rows * this.charHeight
	get height(): number {
		return this._height
	}

	private containerWidth: number | undefined
	private containerHeight: number | undefined

	constructor(parentElement: HTMLElement, className?: string, width?: number, height?: number, assetPath = 'assets/') {
		super()

		this.canvas = document.createElement('canvas')
		this.container = document.createElement('div')
		this.inputElement = document.createElement('input')
		this.inputElement.type = 'text'
		parentElement.append(this.container)
		this.container.append(this.canvas)
		this.container.append(this.inputElement)

		this.rows = VIDEO_MODES[DEFAULT_VIDEO_MODE].rows
		this.cols = VIDEO_MODES[DEFAULT_VIDEO_MODE].cols
		this._height = VIDEO_MODES[DEFAULT_VIDEO_MODE].height
		this._width = VIDEO_MODES[DEFAULT_VIDEO_MODE].width
		this._landscape = VIDEO_MODES[DEFAULT_VIDEO_MODE].landscape || false

		this.canvas.width = VIDEO_MODES[DEFAULT_VIDEO_MODE].width
		this.canvas.height = VIDEO_MODES[DEFAULT_VIDEO_MODE].height

		this.containerWidth = width
		this.containerHeight = height

		const targetContainerWidth = this.containerWidth || this._width
		const targetContainerHeight = this.containerHeight || this._height

		this.container.style.width = targetContainerWidth + 'px'
		this.container.style.height = targetContainerHeight + 'px'
		this.container.style.imageRendering = 'pixelated'
		this.container.style.position = 'relative'
		this.container.style.overflow = 'hidden'
		this.container.style['contain'] = 'strict'
		this.canvas.style.position = 'absolute'
		this.canvas.style.top = '0'
		this.canvas.style.left = '0'
		this.canvas.style.right = '0'
		this.canvas.style.bottom = '0'
		this.canvas.style.width = '100%'
		this.canvas.style.height = '100%'

		this.inputElement.style.position = 'absolute'
		this.inputElement.style.top = '0'
		this.inputElement.style.left = '0'
		this.inputElement.style.width = '100%'
		this.inputElement.style.padding = '0'
		this.inputElement.style.margin = '0'
		this.inputElement.style.border = 'none'
		this.inputElement.style.opacity = '0'
		this.inputElement.style.visibility = 'hidden'

		this.canvas.className = className || ''
		this.container.tabIndex = 0
		const context = this.canvas.getContext('2d')
		if (context === null) throw new Error('Could not get 2D context for Console')
		this.ctx = context
		this.ctx.setTransform(1, 0, 0, 1, 0, 0)
		this.ctx.imageSmoothingEnabled = false
		this.charImg = document.createElement('img')
		this.charImg.src = assetPath + 'charmap.png'

		this._width = width || this.canvas.width
		this._height = height || this.canvas.height

		this._window = null

		this.interval = undefined
		this.cursorEnabled = false
		this.cursorShown = false

		this.reset(false)

		this.container.addEventListener('keydown', (event) => {
			if (this.hasFocus) {
				this.onKeyDown(event)
				event.preventDefault()
			}
		})

		this.container.addEventListener('keyup', (event) => {
			this.onKeyUp(event)
			if (this.hasFocus) {
				event.preventDefault()
			}
		})

		this.canvas.addEventListener('pointerup', (event) => {
			this.onPointerUp(event)
			if (this.hasFocus) {
				event.preventDefault()
			}
		})

		this.container.addEventListener('focusin', () => {
			this.hasFocus = true
		})

		this.container.addEventListener('focusout', () => {
			this.hasFocus = false
		})

		this.inputElement.addEventListener('input', () => {
			this.onInput()
		})

		window.requestAnimationFrame(this.animationFrame)

		document.body.style.setProperty(SCREEN_BORDER_VARIABLE, this.bocolor)

		this.cls()
	}
	private unclip(): void {
		while (this._clipDepth > 0) {
			this._clipDepth--
			this.ctx.restore()
		}
	}
	clip(x1: number, y1: number, x2: number, y2: number): void
	clip(): void
	clip(x1?: unknown, y1?: unknown, x2?: unknown, y2?: unknown): void {
		if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number') {
			this._clipDepth--
			this.ctx.restore()
			return
		}

		this._clipDepth++
		this.ctx.save()
		const clipPath = new Path2D()
		const x = Math.min(x1, x2)
		const y = Math.min(y1, y2)
		const width = Math.abs(x2 - x1)
		const height = Math.abs(y2 - y1)
		clipPath.rect(x, y, width, height)
		this.ctx.clip(clipPath)
	}
	window(x1: number, y1: number, x2: number, y2: number): void
	window(): void
	window(x1?: unknown, y1?: unknown, x2?: unknown, y2?: unknown): void {
		if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number') {
			this._window = null
			return
		}

		const x = Math.min(Math.max(0, Math.min(x1, x2)), this.cols)
		const y = Math.min(Math.max(0, Math.min(y1, y2)), this.rows)
		const width = Math.min(Math.max(0, Math.abs(x2 - x1)), this.cols - x)
		const height = Math.min(Math.max(0, Math.abs(y2 - y1)), this.rows - y)
		this._window = { x, y, width, height }
	}
	onNextFrame(clb: () => void): number {
		return window.requestAnimationFrame(clb)
	}
	cancelOnNextFrame(handle: number): void {
		window.cancelAnimationFrame(handle)
	}

	public animationFrame = (): void => {
		this.sprites.forEach((sprite) => sprite && sprite.update())
		this.repeatKeyboard()
		window.requestAnimationFrame(this.animationFrame)
	}

	private startX(): number {
		return this._window?.x ?? 0
	}

	private startY(): number {
		return this._window?.y ?? 0
	}

	private endX(): number {
		return this._window ? this._window.x + this._window.width : this.cols
	}

	private endY(): number {
		return this._window ? this._window.y + this._window.height : this.rows
	}

	public reset(testMode?: boolean): void {
		this.fgcolorNum = 0
		this.bgcolorNum = 15
		this.bocolorNum = 11
		this.bgcolor = VIDEO_COLORS[this.bgcolorNum]
		this.fgcolor = VIDEO_COLORS[this.fgcolorNum]
		this.bocolor = VIDEO_COLORS[this.bocolorNum]
		this.curX = 0
		this.curY = 0
		this.x = 0
		this.y = 0

		this.charWidth = 8
		this.charHeight = 8

		this.inputMode = false
		this.onInputDone = null
		this.inputStr = ''
		this.keyBuffer.length = 0
		this.keyDown.clear()
		this.onTrappedKey = {}
		this.rows = VIDEO_MODES[DEFAULT_VIDEO_MODE].rows
		this.cols = VIDEO_MODES[DEFAULT_VIDEO_MODE].cols
		this._height = VIDEO_MODES[DEFAULT_VIDEO_MODE].height
		this._width = VIDEO_MODES[DEFAULT_VIDEO_MODE].width

		this._window = null

		this.unclip()
		this.cls()
		this.clearAllSprites()
		this.recording = testMode || false
		this.recorded = ''
		this.enableCursor(false)
		this.enableGamepad(false)

		document.body.style.setProperty(SCREEN_BORDER_VARIABLE, this.bocolor)
	}

	public record(str: string): void {
		if (this.recording) {
			this.recorded += str
		}
	}

	public getRecorded(): string {
		return this.recorded
	}

	public printError(str: string): void {
		if (this.recording) {
			return
		}
		this.print(str)
	}

	public setKeyBuffer(str: string): void {
		this.keyBuffer.length = 0
		for (let i = 0; i < str.length; i++) {
			this.keyBuffer.push(str.charCodeAt(i))
		}
	}

	public resize(width: number, height: number): void {
		this.containerWidth = width
		this.containerHeight = height

		const targetContainerWidth = this.containerWidth || this._width
		const targetContainerHeight = this.containerHeight || this._height

		this.container.style.width = targetContainerWidth + 'px'
		this.container.style.height = targetContainerHeight + 'px'
	}

	public screen(num: number): boolean {
		const dimensions = VIDEO_MODES[num] as IVideoMode | undefined
		if (dimensions === undefined) {
			return false
		}

		this.cursor(false)

		this._width = dimensions.width
		this._height = dimensions.height

		this.rows = dimensions.rows
		this.cols = dimensions.cols

		this.dispatchEvent(
			new CustomEvent('resize', {
				detail: {
					width: this._width,
					height: this._height,
					rows: this.rows,
					cols: this.cols,
				},
			})
		)

		// this.containerWidth = this._width
		// this.containerHeight = this._height

		const targetContainerWidth = this.containerWidth || this._width
		const targetContainerHeight = this.containerHeight || this._height

		this.container.style.width = targetContainerWidth + 'px'
		this.container.style.height = targetContainerHeight + 'px'
		this.container.style.imageRendering = 'pixelated'
		this.container.style.position = 'relative'
		this.container.style.overflow = 'hidden'
		this.container.style['contain'] = 'strict'
		this.canvas.style.position = 'absolute'
		this.canvas.style.top = '0'
		this.canvas.style.left = '0'
		this.canvas.style.right = '0'
		this.canvas.style.bottom = '0'
		this.canvas.style.width = '100%'
		this.canvas.style.height = '100%'

		this.canvas.width = dimensions.width
		this.canvas.height = dimensions.height

		this.ctx.imageSmoothingEnabled = false

		this._window = null

		this.unclip()
		this.cls()
		this.clearAllSprites()

		if (this._landscape !== (dimensions.landscape || false)) {
			this._landscape = dimensions.landscape || false
			this.dispatchEvent(
				new CustomEvent('orientationchange', {
					detail: {
						landscape: this._landscape,
					},
				})
			)
		}

		return true
	}

	public line(x1: number, y1: number, x2: number, y2: number, color?: number): void {
		const strokeBuf = this.ctx.strokeStyle
		this.ctx.beginPath()
		this.ctx.strokeStyle =
			color === undefined ? this.fgcolor : color >= 0 ? VIDEO_COLORS[color] : Console.colorIntegerToRgb(color)
		this.ctx.moveTo(x1, y1)
		this.ctx.lineTo(x2, y2)
		this.ctx.stroke()

		this.curX = x2
		this.curY = y2
		this.ctx.strokeStyle = strokeBuf
	}

	public lineTo(x: number, y: number, color?: number): void {
		this.line(this.curX, this.curY, x, y, color)
	}

	public circle(
		x: number,
		y: number,
		radius: number,
		color?: number,
		start?: number,
		end?: number,
		aspect?: number,
		fill?: boolean,
		step?: boolean
	): void {
		// all parameters are optional except for x, y, radius.
		if (step) {
			x = this.curX + x
			y = this.curY + y
		}

		if (aspect === undefined) {
			aspect = 1.0
		}

		this.ctx.save()
		this.ctx.translate(x, y)
		if (aspect > 0) {
			this.ctx.scale(1.0, aspect)
		} else {
			this.ctx.scale(aspect, 1.0)
		}

		const strokeBuf = this.ctx.strokeStyle
		this.ctx.strokeStyle =
			color === undefined ? this.fgcolor : color >= 0 ? VIDEO_COLORS[color] : Console.colorIntegerToRgb(color)

		if (start === undefined) {
			start = 0.0
		}

		if (end === undefined) {
			end = 2 * Math.PI
		}

		start = 2 * Math.PI - start
		end = 2 * Math.PI - end

		if (fill) {
			this.ctx.beginPath()
			this.ctx.arc(0, 0, radius, start, end, true)
			this.ctx.fillStyle = this.fgcolor
			this.ctx.lineTo(0, 0)
			this.ctx.closePath()
			this.ctx.fill()
		}
		this.ctx.beginPath()
		this.ctx.arc(0, 0, radius, start, end, true)
		this.ctx.stroke()

		this.ctx.restore()
		this.ctx.strokeStyle = strokeBuf
	}

	public box(x1: number, y1: number, x2: number, y2: number, color?: number): void {
		const strokeBuf = this.ctx.strokeStyle
		this.ctx.strokeStyle =
			color === undefined ? this.fgcolor : color >= 0 ? VIDEO_COLORS[color] : Console.colorIntegerToRgb(color)
		this.ctx.beginPath()
		this.ctx.moveTo(x1, y1)
		this.ctx.lineTo(x2, y1)
		this.ctx.lineTo(x2, y2)
		this.ctx.lineTo(x1, y2)
		this.ctx.lineTo(x1, y1)
		this.ctx.stroke()

		this.curX = x2
		this.curY = y2
		this.ctx.strokeStyle = strokeBuf
	}

	public fill(x1: number, y1: number, x2: number, y2: number, color?: number): void {
		const fillBuf = this.ctx.fillStyle
		this.ctx.fillStyle =
			color === undefined ? this.fgcolor : color >= 0 ? VIDEO_COLORS[color] : Console.colorIntegerToRgb(color)
		this.ctx.beginPath()
		this.ctx.rect(x1, y1, x2 - x1 + 1, y2 - y1 + 1)
		this.ctx.fill()

		this.curX = x2
		this.curY = y2
		this.ctx.fillStyle = fillBuf
	}

	public triangleFill(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color?: number): void {
		const fillBuf = this.ctx.fillStyle
		this.ctx.fillStyle =
			color === undefined ? this.fgcolor : color >= 0 ? VIDEO_COLORS[color] : Console.colorIntegerToRgb(color)
		this.ctx.beginPath()
		this.ctx.moveTo(x1, y1)
		this.ctx.lineTo(x2, y2)
		this.ctx.lineTo(x3, y3)
		this.ctx.lineTo(x1, y1)
		this.ctx.fill()

		this.curX = x3
		this.curY = y3
		this.ctx.fillStyle = fillBuf
	}

	public getPixel(x: number, y: number): [number, number, number] {
		const image = this.ctx.getImageData(x, y, 1, 1)
		return [image.data[0], image.data[1], image.data[2]]
	}

	public putPixel(x: number, y: number, color: number): void
	public putPixel(x: number, y: number, color: [number, number, number]): void
	public putPixel(x: number, y: number, color: [number, number, number] | number): void {
		const fillBuf = this.ctx.fillStyle
		if (typeof color === 'number') {
			if (color < 0) {
				this.ctx.fillStyle = Console.colorIntegerToRgb(color)
			} else {
				this.ctx.fillStyle = VIDEO_COLORS[color & VIDEO_COLORS_MASK]
			}
		} else {
			this.ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
		}
		this.ctx.beginPath()
		this.ctx.rect(x, y, 1, 1)
		this.ctx.fill()
		this.ctx.fillStyle = fillBuf
	}

	public get(x1?: number, y1?: number, x2?: number, y2?: number): Uint8ClampedArray {
		let temp: number

		x1 = x1 ?? 0
		y1 = y1 ?? 0
		x2 = x2 ?? this._width
		y2 = y2 ?? this._height

		if (x1 > x2) {
			temp = x1
			x1 = x2
			x2 = temp
		}

		if (y1 > y2) {
			temp = y1
			y1 = y2
			y2 = temp
		}

		const data = this.ctx.getImageData(x1, y1, x2 - x1, y2 - y1)
		return data.data
	}

	public put(data: Uint8ClampedArray, x?: number, y?: number, width?: number, height?: number): void {
		width = width ?? this._width
		height = height ?? this._height
		x = x ?? 0
		y = y ?? 0
		const imageData = new ImageData(width, height)
		imageData.data.set(data)

		this.ctx.putImageData(imageData, x, y)
	}

	public paint(x: number, y: number, color: number, borderColor?: number): void {
		const image = new ImageManipulator(this.ctx.getImageData(0, 0, this._width, this._height))
		x = Math.max(0, Math.min(image.image.width, x))
		y = Math.max(0, Math.min(image.image.height, y))

		const colorRgb = color < 0 ? Console.colorIntegerToRgb(color) : VIDEO_COLORS[color & VIDEO_COLORS_MASK]
		const [fillR, fillG, fillB] = Console.rgbToNumbers(colorRgb)

		let borderR, borderG, borderB
		let borderIsBackground = true
		if (borderColor !== undefined) {
			const colorRgb =
				borderColor < 0 ? Console.colorIntegerToRgb(borderColor) : VIDEO_COLORS[borderColor & VIDEO_COLORS_MASK]
			borderIsBackground = false
			;[borderR, borderG, borderB] = Console.rgbToNumbers(colorRgb)
		} else {
			;[borderR, borderG, borderB] = image.get(x, y)
		}

		if (borderIsBackground && fillR === borderR && fillG === borderG && fillB === borderB) return

		const pixelQueue: [number, number][] = []
		pixelQueue.push([x, y])

		let currentPixel: [number, number] | undefined
		while ((currentPixel = pixelQueue.shift())) {
			const [oldR, oldG, oldB] = image.get(currentPixel[0], currentPixel[1])
			if (borderIsBackground && (oldR !== borderR || oldG !== borderG || oldB !== borderB)) continue
			if (!borderIsBackground && (oldR === borderR || oldG === borderG || oldB === borderB)) continue
			image.put(currentPixel[0], currentPixel[1], fillR, fillG, fillB, 255)
			if (currentPixel[0] > 0) pixelQueue.push([currentPixel[0] - 1, currentPixel[1]])
			if (currentPixel[0] < image.image.width) pixelQueue.push([currentPixel[0] + 1, currentPixel[1]])
			if (currentPixel[1] > 0) pixelQueue.push([currentPixel[0], currentPixel[1] - 1])
			if (currentPixel[1] < image.image.height) pixelQueue.push([currentPixel[0], currentPixel[1] + 1])
		}
		this.ctx.putImageData(image.image, 0, 0)
	}

	private innerLoadImage(
		img: HTMLImageElement,
		url: string,
		resolve: (value: number | PromiseLike<number>) => void,
		reject: (reason?: any) => void
	) {
		img.src = url
		img
			.decode()
			.then(() => {
				const idx = this.images.findIndex((i) => i === undefined)
				if (idx >= 0) {
					this.images[idx] = img
					resolve(idx)
				} else {
					resolve(this.images.push(img) - 1)
				}
			})
			.catch(reject)
	}

	public async loadImage(urlOrData: string | Blob): Promise<number> {
		return new Promise((resolve, reject) => {
			const img = document.createElement('img')
			img.addEventListener('error', (e) => {
				reject(e)
			})
			if (typeof urlOrData !== 'string') {
				const blobUrl = URL.createObjectURL(urlOrData)
				this.innerLoadImage(img, blobUrl, resolve, reject)
			} else {
				const url = urlOrData
				this.innerLoadImage(img, url, resolve, reject)
			}
		})
	}

	public getImage(handle: number): HTMLImageElement {
		const image = this.images[handle]
		if (image === undefined) throw new Error('Floating image handle')
		return image
	}

	public clearImage(handle: number): void {
		this.images[handle] = undefined
	}

	private static clampCoordToDimention(coord: number, max: number) {
		if (coord < 0) {
			return max + (coord % max)
		} else {
			return coord % max
		}
	}

	private static drawImageWithWrap(
		ctx: CanvasRenderingContext2D,
		image: HTMLImageElement,
		sx: number,
		sy: number,
		sw: number,
		sh: number,
		dx: number,
		dy: number,
		dw: number,
		dh: number,
		screenWidth: number,
		screenHeight: number
	) {
		let curDX = dx
		let curDY = dy
		let curSX = Console.clampCoordToDimention(sx, image.naturalWidth)
		let curSY = Console.clampCoordToDimention(sy, image.naturalHeight)
		let curSW = sw
		let curSH = sh

		while (curDY < dy + dh) {
			const clampedSH = Math.min(image.naturalHeight, curSY + curSH) - curSY
			const curDH = Math.max(1, (clampedSH / sh) * dh)
			// skip drawing if outside of the canvas
			if (curDY + curDH > 0 && curDY < screenHeight) {
				while (curDX < dx + dw) {
					let clampedSW = Math.min(image.naturalWidth, curSX + curSW) - curSX
					if (clampedSW === 0) {
						curSW = sw
						clampedSW = Math.min(image.naturalWidth, curSX + curSW) - curSX
					}
					const curDW = (clampedSW / sw) * dw
					// skip drawing if outside of the canvas
					if (curDX + curDW > 0 && curDX < screenWidth) {
						ctx.drawImage(image, curSX, curSY, clampedSW, clampedSH, curDX, curDY, curDW, curDH)
					}
					curSW = curSW - clampedSW
					curSX = 0
					curDX = Math.round(curDX + curDW)
				}
			}

			curSH = curSH - clampedSH
			curSY = 0
			curDY = Math.round(curDY + curDH)

			curDX = dx
			curSW = sw
			curSX = Console.clampCoordToDimention(sx, image.naturalWidth)
		}
	}

	public putImage(
		image: HTMLImageElement,
		dx: number,
		dy: number,
		dw?: number,
		dh?: number,
		sx?: number,
		sy?: number,
		sw?: number,
		sh?: number
	): void {
		if (sx !== undefined && sy !== undefined && dh !== undefined && dw !== undefined) {
			Console.drawImageWithWrap(
				this.ctx,
				image,
				sx,
				sy,
				sw || image.naturalWidth,
				sh || image.naturalHeight,
				dx,
				dy,
				dw,
				dh,
				this._width,
				this._height
			)
		} else if (dh !== undefined && dw !== undefined) {
			this.ctx.drawImage(image, dx, dy, dw, dh)
		} else {
			this.ctx.drawImage(image, dx, dy)
		}
	}

	public cls(): void {
		this.record('[CLS]')
		this.cursor(false)
		this.x = this._window?.x ?? 0
		this.y = this._window?.y ?? 0

		const x = this.x * this.charWidth
		const y = this.y * this.charHeight
		const width = this._window?.width !== undefined ? this._window.width * this.charWidth : this._width
		const height = this._window?.height !== undefined ? this._window.height * this.charHeight : this._height

		this.ctx.fillStyle = this.bgcolor
		this.ctx.fillRect(x, y, width, height)
	}

	public locate(row: number, col: number): void {
		this.record('[L' + row + ',' + col + ']')
		this.cursor(false)
		this.x = Math.max(0, Math.min(Math.floor(col) - 1, this.cols)) ?? this.x ?? 0
		this.y = Math.max(0, Math.min(Math.floor(row) - 1, this.rows)) ?? this.y ?? 0
	}

	private static colorIntegerToRgb(color: number): string {
		const source = Math.abs(color) & 32767 // using 15-bit color
		const red = ((source >> 10) & 31) << 3
		const green = ((source >> 5) & 31) << 3
		const blue = (source & 31) << 3
		return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue
			.toString(16)
			.padStart(2, '0')}`
	}

	private static rgbToNumbers(color: string): [number, number, number] {
		const red = Number.parseInt(color.substring(1, 3), 16)
		const green = Number.parseInt(color.substring(3, 5), 16)
		const blue = Number.parseInt(color.substring(5, 7), 16)
		return [red, green, blue]
	}

	public color(fg: number | null, bg: number | null, bo: number | null): void {
		if (fg === null) {
			fg = this.fgcolorNum
		}
		if (bg === null) {
			bg = this.bgcolorNum
		}
		if (bo === null) {
			bo = this.bocolorNum
		}
		this.record('[C' + fg)
		this.record(',' + bg)
		this.record(',' + bo)
		this.record(']\n')

		this.fgcolorNum = fg
		this.fgcolor = fg < 0 ? Console.colorIntegerToRgb(fg) : VIDEO_COLORS[fg & VIDEO_COLORS_MASK]
		this.bgcolorNum = bg
		this.bgcolor = bg < 0 ? Console.colorIntegerToRgb(bg) : VIDEO_COLORS[bg & VIDEO_COLORS_MASK]
		this.bocolorNum = bo
		this.bocolor = bo < 0 ? Console.colorIntegerToRgb(bo) : VIDEO_COLORS[bo & VIDEO_COLORS_MASK]

		document.body.style.setProperty(SCREEN_BORDER_VARIABLE, this.bocolor)
	}

	public scroll(): void {
		this.cursor(false)
		const sx = this.startX() * this.charWidth
		const sy = (this.startY() + 1) * this.charHeight
		const swidth = this._window ? this._window.width * this.charWidth : this._width
		const sheight = this._window ? (this._window.height - 1) * this.charHeight : this._height - this.charHeight

		const tx = this.startX() * this.charWidth
		const ty = this.startY() * this.charHeight
		const twidth = swidth
		const theight = sheight
		this.ctx.drawImage(this.canvas, sx, sy, swidth, sheight, tx, ty, twidth, theight)
		this.ctx.fillStyle = this.bgcolor

		const fillx = (this._window?.x ?? 0) * this.charWidth
		const filly = this._window
			? (this._window.y + this._window.height - 1) * this.charHeight
			: this._height - this.charHeight
		const fillwidth = this._window ? this._window.width * this.charWidth : this._width
		const fillheight = this.charHeight
		this.ctx.fillRect(fillx, filly, fillwidth, fillheight)
		this.y -= 1
	}

	public async input(newLineAfterEnter: boolean): Promise<string> {
		return new Promise<string>((resolve) => {
			if (this.recording) {
				let str = ''
				while (this.keyBuffer.length > 0) {
					str += String.fromCharCode(this.keyBuffer.shift()!)
				}

				resolve(str)
			} else {
				this.dispatchEvent(new CustomEvent('input'))
				this.enableCursor(true)
				this.onInputDone = resolve
				this.inputMode = true
				this.inputStr = ''
				this.inputNewLineAfterEnter = newLineAfterEnter || false
				const targetContainerHeight = this.containerHeight || this._height
				this.inputPixelAspect = targetContainerHeight / this._height
				this.inputElement.style.top = `${this.y * this.charHeight * this.inputPixelAspect}px`
			}
		})
	}

	public onKey(num: number, handler: (() => void) | undefined): void {
		if (handler) {
			this.onTrappedKey[num] = handler
		} else {
			delete this.onTrappedKey[num]
		}
	}

	public backup(num: number): void {
		this.cursor(false)

		let virtualX = this.x - this.startX()
		virtualX -= num
		const minY = this.startY()
		while (virtualX < 0) {
			this.y -= 1
			virtualX += this._window ? this._window.width : this.cols
		}

		if (this.y < minY) {
			this.y = minY
		}

		this.x = virtualX + this.startX()
	}

	private keyRepeatThrottle = 0
	private repeatKeyboard() {
		// do not repeat keys if a global key trap is set
		if (!this.onTrappedKey[-1]) {
			if (this.keyRepeatThrottle % 5 === 0) {
				this.keyDown.forEach((char) => {
					this.pushKeyToBuffer(char)
				})
			}
			this.keyRepeatThrottle++
		}
	}

	private pushKeyToBuffer(key: string) {
		if (key in SPECIAL_CHARS) {
			this.keyBuffer.push(0)
			this.keyBuffer.push(SPECIAL_CHARS[key])
		} else if (key.length === 1) {
			const code = key.codePointAt(0)
			if (code !== undefined) this.keyBuffer.push(code)
		}
	}

	public onKeyUp(event: KeyboardEvent): void {
		this.keyDown.delete(event.code)

		this.handleTrappedKey(this.keyBuffer[this.keyBuffer.length - 1])
	}

	public onPointerUp(event: PointerEvent): void {
		if (event.pointerType !== 'mouse' && this.onTrappedKey[-1]) {
			this.onTrappedKey[-1](-1)
		}
	}

	public onInput(): void {
		if (this.inputMode) {
			this.backup(this.inputStr.length)
			this.print(''.padEnd(this.inputStr.length, ' '))
			this.backup(this.inputStr.length)
			this.inputStr = this.inputElement.value
			this.print(this.inputStr)
			this.inputElement.style.top = `${this.y * this.charHeight * this.inputPixelAspect}px`
		}
	}

	public onKeyDown(event: KeyboardEvent): void {
		if (this.inputMode) {
			// if input position is at least 1,
			if (this.inputStr.length > 0) {
				// if it's backspace,
				if (event.key === 'Backspace') {
					this.inputStr = this.inputStr.substr(0, this.inputStr.length - 1)
					this.backup(1)
					this.print(' ')
					this.backup(1)
				}
			}

			if (event.key === 'Enter') {
				// done
				this.inputMode = false
				if (this.inputNewLineAfterEnter) {
					this.print('\n')
				}
				this.enableCursor(false)
				if (this.onInputDone) this.onInputDone(this.inputStr)
			}

			if (event.key.length === 1) {
				// insert the character at the string position, and increment input
				// position.
				let ch = event.key
				if (event.shiftKey) ch = ch.toUpperCase()
				this.inputStr += ch
				this.print(ch)
			}

			this.inputElement.style.top = `${this.y * this.charHeight * this.inputPixelAspect}px`
		} else {
			if (!event.repeat) {
				if (!this.keyDown.has(event.code)) {
					this.pushKeyToBuffer(event.key)
					this.keyDown.set(event.code, event.key)
				}
			}
		}
	}

	private handleTrappedKey(num: number) {
		if (this.onTrappedKey[num]) {
			const key = this.keyBuffer[this.keyBuffer.length - 1]
			this.onTrappedKey[num](key)
		} else if (this.onTrappedKey[-1]) {
			const key = this.keyBuffer[this.keyBuffer.length - 1]
			this.onTrappedKey[-1](key)
		}
	}

	public getKeyFromBuffer(): number {
		if (this.keyBuffer.length > 0) {
			return this.keyBuffer.shift()!
		} else {
			return -1
		}
	}

	public enableCursor(enabled: boolean): void {
		if (enabled && !this.cursorEnabled) {
			this.inputElement.value = ''
			this.inputElement.style.visibility = 'visible'
			this.interval = window.setInterval(() => this.toggleCursor(), 500)
			this.cursor(true)
		} else {
			this.inputElement.style.visibility = 'hidden'
			window.clearInterval(this.interval)
			this.cursor(false)
		}

		this.cursorEnabled = enabled
	}

	public toggleCursor(): void {
		this.cursor(!this.cursorShown)
	}

	public cursor(show: boolean): void {
		if (show === this.cursorShown) {
			return
		}

		if (show) {
			if (this.y === this.endY()) {
				this.scroll()
			}

			this.ctx.fillStyle = this.fgcolor
			this.ctx.fillRect(this.x * this.charWidth, this.y * this.charHeight + this.charHeight - 2, this.charWidth, 2)
		} else {
			this.ctx.fillStyle = this.bgcolor
			this.ctx.fillRect(this.x * this.charWidth, this.y * this.charHeight + this.charHeight - 2, this.charWidth, 2)
		}

		this.cursorShown = show
	}

	public newline(): void {
		this.x = this.startX()
		this.y += 1
	}

	public print(str: string): void {
		if (this.recording) {
			this.recorded += str
		}

		this.cursor(false)

		const maxY = this.endY()
		const maxX = this.endX()

		for (let i = 0; i < str.length; i++) {
			if (this.y === maxY) {
				this.scroll()
			}

			if (str[i] === '\n') {
				this.newline()
			} else {
				const ch = str.charCodeAt(i)
				// clear cell
				this.ctx.save()
				const charRegion = new Path2D()
				charRegion.rect(this.x * this.charWidth, this.y * this.charHeight, this.charWidth, this.charHeight)
				this.ctx.clip(charRegion)
				this.ctx.clearRect(this.x * this.charWidth, this.y * this.charHeight, this.charWidth, this.charHeight)
				// paint black-on-transparent character
				this.ctx.globalCompositeOperation = 'source-over'
				this.ctx.drawImage(
					this.charImg,
					this.charWidth * (ch % 16),
					this.charHeight * Math.floor(ch / 16),
					this.charWidth,
					this.charHeight,
					this.x * this.charWidth,
					this.y * this.charHeight,
					this.charWidth,
					this.charHeight
				)
				// paint foreground color
				this.ctx.globalCompositeOperation = 'source-in'
				this.ctx.fillStyle = this.fgcolor
				this.ctx.fillRect(this.x * this.charWidth, this.y * this.charHeight, this.charWidth, this.charHeight)
				// paint background color
				this.ctx.globalCompositeOperation = 'destination-over'
				this.ctx.fillStyle = this.bgcolor
				this.ctx.fillRect(this.x * this.charWidth, this.y * this.charHeight, this.charWidth, this.charHeight)
				this.ctx.globalCompositeOperation = 'source-over'
				this.ctx.restore()

				this.x += 1
				if (this.x === maxX) {
					this.newline()
				}
			}
		}
	}

	public async createSprite(spriteNumber: number, image: HTMLImageElement, frames = 1): Promise<void> {
		if (this.sprites[spriteNumber]) {
			this.clearSprite(spriteNumber)
		}

		const targetContainerWidth = this.containerWidth || this._width
		const targetContainerHeight = this.containerHeight || this._height

		const sprite = new Sprite(
			image,
			spriteNumber,
			frames,
			targetContainerWidth / this._width,
			targetContainerHeight / this._height
		)
		this.container.appendChild(sprite.getElement())
		this.sprites[spriteNumber] = sprite
		return sprite.loaded
	}

	public clearSprite(spriteNumber: number): void {
		const sprite = this.sprites[spriteNumber]
		if (sprite) {
			this.container.removeChild(sprite.getElement())
			this.sprites[spriteNumber] = undefined
		}
	}

	public clearAllSprites(): void {
		this.sprites.forEach((sprite) => {
			if (sprite) {
				this.container.removeChild(sprite.getElement())
			}
		})
		this.sprites.length = 0
	}

	public offsetSprite(spriteNumber: number, x: number, y: number): void {
		const sprite = this.sprites[spriteNumber]
		if (sprite) {
			sprite.setPosition(x, y)
		}
	}

	public scaleSprite(spriteNumber: number, scaleX: number, scaleY: number): void {
		const sprite = this.sprites[spriteNumber]
		if (sprite) {
			sprite.setScale(scaleX, scaleY)
		}
	}

	public homeSprite(spriteNumber: number, homeX: number, homeY: number): void {
		const sprite = this.sprites[spriteNumber]
		if (sprite) {
			sprite.setAnchor(homeX, homeY)
		}
	}

	public displaySprite(spriteNumber: number, display: boolean): void {
		const sprite = this.sprites[spriteNumber]
		if (sprite) {
			sprite.setDisplay(display)
		}
	}

	public rotateSprite(spriteNumber: number, angle: number): void {
		const sprite = this.sprites[spriteNumber]
		if (sprite) {
			sprite.setRotate(angle)
		}
	}

	public animateSprite(
		spriteNumber: number,
		startFrame: number,
		endFrame: number,
		speed = 1,
		loop?: boolean,
		pingPong?: boolean,
		pingPongFlip?: number
	): void {
		const sprite = this.sprites[spriteNumber]
		if (sprite) {
			sprite.setAnimate(startFrame, endFrame, speed, loop ?? true, pingPong ?? false, pingPongFlip ?? 0)
		}
	}

	public enableGamepad(enable: boolean): void {
		if (enable && this.gamepadEnabled === false) {
			this.gamepadEnabled = true
			// TODO: attach event listeners
		} else if (!enable && this.gamepadEnabled === true) {
			this.gamepadEnabled = false
			// TODO: remove event listeners
		}
	}

	public getPotValue(_potId: number, _padId: number): number {
		return 0
	}

	public getJoystickValue(_padId: number): number {
		return 0
	}
}
