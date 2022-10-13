/**
	Copyright 2021 Jan Starzak

	This file is part of qbasic-vm

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

export class Sprite {
	private _x: number = 0
	get x(): number {
		return this._x
	}

	private _y: number = 0
	get y(): number {
		return this._y
	}

	private _frames: number = 1
	get frames(): number {
		return this._frames
	}

	private _scaleX: number = 1
	get scaleX(): number {
		return this._scaleX
	}

	private _scaleY: number = 1
	get scaleY(): number {
		return this._scaleY
	}

	private _rotation: number = 0
	get rotation(): number {
		return this._rotation
	}

	private _anchorX: number = 0
	get anchorX(): number {
		return this._anchorX
	}
	private _anchorY: number = 0
	get anchorY(): number {
		return this._anchorY
	}

	private _el: HTMLDivElement

	private _pAspectX: number = 1
	private _pAspectY: number = 1
	private _frameWidth: number = 0
	private _imgWidth: number = 0
	private _imgHeight: number = 0

	// Internally, frames are 0-indexed, but BASIC sprite frames are 1-indexed
	private _curFrame: number = 0
	private _totalFrames: number = 0
	private _beginFrame: number = 0
	private _endFrame: number = 0

	private _animDirection: number = 1
	private _animating: boolean = false
	private _loop: boolean = false
	private _pingPong: boolean = false
	private _pingPongFlip: number = 0
	private _speed: number = 1
	private _skip: number = 0

	private _display: boolean = true
	get display(): boolean {
		return this._display
	}

	private _loaded: Promise<void>
	get loaded(): Promise<void> {
		return this._loaded
	}

	private _spriteData: number[] = []

	/**
	 *
	 * @param image Image to be used for the sprite
	 * @param frames Number of frames in sprite
	 * @param pAspectX Display (BASIC Console) pixel X aspect ratio
	 * @param pAspectY Display (BASIC COnsole) pixel Y aspect ratio
	 */
	constructor(
		image: HTMLImageElement,
		index: number,
		frames: number,
		pAspectX: number,
		pAspectY: number
	) {
		this._pAspectX = pAspectX
		this._pAspectY = pAspectY
		this._totalFrames = frames
		this._endFrame = frames - 1
		this._el = document.createElement('div')
		this._el.style.position = 'absolute'
		this._el.style.top = '0'
		this._el.style.left = '0'
		this._el.style.zIndex = index.toString()
		this._loaded = new Promise<void>(resolve => {
			const url = image.src
			this._el.style.backgroundImage = `url('${url}')`
			this._imgHeight = image.naturalHeight
			this._imgWidth = image.naturalWidth
			this._frameWidth = image.naturalWidth / frames
			this._el.style.height = `${image.naturalHeight *
				this._pAspectY}px`
			this._el.style.width = `${this._frameWidth * this._pAspectX}px`
			this._el.style.backgroundSize = `${this._imgWidth *
				pAspectX}px ${this._imgHeight * pAspectY}px`
			this.reposition()
			this.bkgReposition()
			resolve()
		})
	}

	private doPingPong() {
		this._animDirection = -1 * this._animDirection
		if (this._pingPongFlip & 4) {
			// signs are the same
			if (this._scaleX * this._scaleY > 0) {
				if (this._pingPongFlip & 6) {
					this._scaleY = this._scaleY * -1
				} else {
					this._scaleX = this._scaleX * -1
				}
				// signs are different
			} else if (this._scaleX * this._scaleY < 0) {
				if (this._pingPongFlip & 6) {
					this._scaleX = this._scaleX * -1
				} else {
					this._scaleY = this._scaleY * -1
				}
			}
		} else {
			if (this._pingPongFlip & 1) {
				this._scaleX = this._scaleX * -1
			}
			if (this._pingPongFlip & 2) {
				this._scaleY = this._scaleY * -1
			}
		}
		this._curFrame = Math.max(
			Math.min(this._curFrame + this._animDirection, this._totalFrames),
			-1
		)
	}

	update() {
		if (this._animating) {
			this._skip++
			if (this._skip < this._speed) {
				// wait at _skip-times until actually animating this sprite
				return
			} else {
				this._skip = 0
			}

			let oldFrame = this._curFrame
			this._curFrame = Math.max(
				Math.min(
					this._curFrame + this._animDirection,
					this._totalFrames
				),
				-1
			)
			if (this._curFrame > this._endFrame) {
				if (this._loop) {
					if (this._pingPong) {
						this._curFrame = this._endFrame
						oldFrame = -1 // oldFrame will be the same as _curFrame,
						// but we should keep animating, because we changed direction
						this.doPingPong()
					} else {
						this._curFrame = this._beginFrame
					}
				} else {
					this._curFrame = this._endFrame
					this._animating = false
				}
			} else if (this._curFrame < this._beginFrame) {
				if (this._loop) {
					if (this._pingPong) {
						this._curFrame = this._beginFrame
						oldFrame = -1 // oldFrame will be the same as _curFrame,
						// but we should keep animating, because we changed direction
						this.doPingPong()
					} else {
						this._curFrame = this._endFrame
					}
				} else {
					this._curFrame = this._beginFrame
					this._animating = false
				}
			}
			if (oldFrame === this._curFrame) this._animating = false
			this.bkgReposition()
		}
	}

	private bkgReposition() {
		this._el.style.backgroundPosition = `-${this._curFrame *
			this._frameWidth *
			this._pAspectX}px 0`
		this.reposition()
	}

	private reposition() {
		this._el.style.transformOrigin = `${this._anchorX *
			this._pAspectX}px ${this._anchorY * this._pAspectY}px`
		this._el.style.transform = `translate(-${this._anchorX *
			this._pAspectX}px, -${this._anchorY *
			this._pAspectY}px) translate(${this._x * this._pAspectX}px, ${this
				._y * this._pAspectY}px) scale(${this._scaleX}, ${this._scaleY
			}) rotate(${this._rotation}deg)`
	}

	setPosition(x: number, y: number) {
		this._x = x
		this._y = y
		this.reposition()
	}

	setScale(scaleX: number, scaleY: number) {
		this._scaleX = scaleX
		this._scaleY = scaleY
		this.reposition()
	}

	setRotate(angle: number) {
		this._rotation = angle
		this.reposition()
	}

	setAnchor(anchorX: number, anchorY: number) {
		this._anchorX = anchorX
		this._anchorY = anchorY
		this.reposition()
	}

	setDisplay(display: boolean) {
		this._display = display
		this._el.style.visibility = display ? 'visible' : 'hidden'
	}

	getElement(): HTMLDivElement {
		return this._el
	}

	setAnimate(
		startFrame: number,
		endFrame: number,
		speed: number,
		loop: boolean,
		pingPong: boolean,
		pingPongFlip: number
	) {
		this._animDirection = startFrame <= endFrame ? 1 : -1
		this._beginFrame = Math.min(startFrame, endFrame)
		this._endFrame = Math.max(startFrame, endFrame)
		this._curFrame = startFrame
		this._loop = loop
		this._animating = true
		this._speed = speed
		this._pingPong = pingPong || false
		this._pingPongFlip = pingPongFlip || 0
	}

	getData(index: number) {
		return this._spriteData[index] || 0
	}

	setData(index: number, value: number) {
		this._spriteData[index] = value
	}
}
