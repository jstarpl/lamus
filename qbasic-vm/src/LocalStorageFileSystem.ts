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

import { STRUCTURED_INPUT_MATCH } from './IConsole'
import { FileAccessMode, IFileSystem } from './IFileSystem'

enum KNOWN_MIME_TYPES {
	BINARY = 'application/octet-stream',
	PLAIN = 'text/plain',
	STRUCTURED_TEXT = 'text/csv',
	JSON = 'application/json'
}

type FileHandle = {
	fileName: string
	modified: boolean
	mode: FileAccessMode
	contents: string | number[] | object[]
	position: number
	meta: Record<string, string | number>
}

const STORAGE_PREFIX = 'LocalStorageFileSystem'
const META_PREFIX = 'META'

function arrayBuffer2String(buf: ArrayBuffer | ArrayLike<number>) {
	if (Array.isArray(buf)) {
		const source = buf
		const sourceLen = source.length
		// we're writing to a Unicode string, so the buffer length
		// needs to be multiples of 2
		buf = new ArrayBuffer(sourceLen + (sourceLen % 2))
		const bufView = new Uint8Array(buf)
		// treat source as an array of bytes
		for (let i = 0; i < sourceLen; i++) {
			bufView[i] = source[i]
		}
	}
	// write as two-byte Unicode words
	return String.fromCharCode.apply(null, new Uint16Array(buf))
}
function string2ArrayBuffer(str: string) {
	const buf = new ArrayBuffer(str.length * 2) // 2 bytes for each char
	const bufView = new Uint16Array(buf)
	const strLen = str.length
	for (let i = 0; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i)
	}
	return buf
}

export class LocalStorageFileSystem implements IFileSystem {
	private fileHandles: (FileHandle | undefined)[] = []
	private csvMatch = new RegExp(STRUCTURED_INPUT_MATCH)

	readonly pathSeparator: string = '/'
	getFreeFileHandle(): number {
		const freeHandle = this.fileHandles.findIndex((handle) => handle === undefined)
		if (freeHandle === -1) {
			return this.fileHandles.length
		}
		return freeHandle
	}
	getUsedFileHandles(): number[] {
		return this.fileHandles
			.map((handle, index) => (handle === undefined ? undefined : index))
			.filter((index) => index !== undefined) as number[]
	}
	async open(handle: number, fileName: string, mode: FileAccessMode): Promise<void> {
		let meta: Record<string, string | number>
		try {
			meta = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}:${META_PREFIX}:${fileName}`) as string) || {
				created: Date.now(),
			}
		} catch {
			meta = {
				created: Date.now(),
			}
		}
		let someContents: string | ArrayBuffer | null = localStorage.getItem(`${STORAGE_PREFIX}:${fileName}`)
		let position = 0
		if (someContents === null) {
			const requestResult = await fetch(fileName)
			if (requestResult.status === 200) {
				meta.url = requestResult.url
				if (mode === FileAccessMode.BINARY) {
					someContents = await requestResult.arrayBuffer()
					meta.contentType = requestResult.headers.get('content-type') || KNOWN_MIME_TYPES.BINARY
				} else {
					someContents = await requestResult.text()
					meta.contentType = requestResult.headers.get('content-type') || KNOWN_MIME_TYPES.PLAIN
				}
			} else {
				someContents = null
			}
		}

		let contents: string | number[] | object[]
		if (mode === FileAccessMode.RANDOM) {
			if (!someContents) {
				contents = []
				// we're creating this file, so let's assign a sensible mimetype
				meta.contentType = KNOWN_MIME_TYPES.JSON
			} else {
				try {
					contents = JSON.parse(someContents as string)
					if (!Array.isArray(contents)) {
						contents = []
					}
				} catch {
					contents = []
				}
			}
		} else if (mode === FileAccessMode.BINARY) {
			if (someContents === null) {
				someContents = ''
				// we're creating this file, so let's assign a sensible mimetype
				meta.contentType = KNOWN_MIME_TYPES.BINARY
			}

			contents =
				someContents instanceof ArrayBuffer
					? Array.from(new Uint8Array(someContents))
					: Array.from(new Uint8Array(string2ArrayBuffer(someContents)))

			if (meta.size) {
				// storage medium is a unicode string, which is always multiples of 2.
				// This will trim the excess byte, if odd number of bytes are written.
				contents.length = meta.size as number
			}
		} else {
			if (someContents === null) {
				// we're creating this file, so let's assign a sensible mimetype
				meta.contentType = KNOWN_MIME_TYPES.STRUCTURED_TEXT
			}
			contents = (someContents as string) || ''
			if (mode === FileAccessMode.APPEND) {
				position = contents.length
			}
		}

		this.fileHandles[handle] = {
			fileName,
			mode,
			modified: false,
			contents,
			position,
			meta,
		}
	}
	async close(handle: number): Promise<void> {
		const fileHandle = this.fileHandles[handle]

		if (!fileHandle) {
			throw new Error('Invalid file handle.')
		}

		if (fileHandle.mode !== FileAccessMode.INPUT && fileHandle.modified) {
			const contents =
				fileHandle.mode === FileAccessMode.BINARY
					? arrayBuffer2String(fileHandle.contents as number[])
					: fileHandle.mode === FileAccessMode.RANDOM
					? JSON.stringify(fileHandle.contents)
					: fileHandle.contents.toString()
			localStorage.setItem(`${STORAGE_PREFIX}:${fileHandle.fileName}`, contents)
			localStorage.setItem(
				`${STORAGE_PREFIX}:${META_PREFIX}:${fileHandle.fileName}`,
				JSON.stringify({ ...fileHandle.meta, size: contents.length })
			)
		}
	}
	private static serializeForWrite(buf: string | number | object): string {
		if (typeof buf === 'number') {
			return buf.toString(10)
		} else if (typeof buf === 'string') {
			return '"' + buf.replace(/"/g, '""') + '"'
		} else {
			return Object.keys(buf)
				.map((key) => this.serializeForWrite(buf[key]))
				.join(',')
		}
	}
	private static deserializeForRead(buf: string): string | number {
		if (buf.match(/^".*"$/)) {
			return buf.substr(1, buf.length - 2).replace(/""/g, '"')
		} else {
			return Number.parseFloat(buf)
		}
	}
	async write(handle: number, buf: string | number | object): Promise<void> {
		const fileHandle = this.fileHandles[handle]
		if (!fileHandle) {
			throw new Error('Invalid file handle.')
		} else if (fileHandle.mode === FileAccessMode.INPUT) {
			throw new Error('Wrong file access mode.')
		}

		if (typeof fileHandle.contents === 'string') {
			fileHandle.contents =
				fileHandle.contents.substr(0, fileHandle.position) + LocalStorageFileSystem.serializeForWrite(buf) + ','
			fileHandle.position = fileHandle.contents.length
		} else {
			if (typeof buf === 'string') {
				fileHandle.contents.splice(
					fileHandle.position,
					buf.length,
					...Array.from(new Uint8Array(string2ArrayBuffer(buf)))
				)
				fileHandle.position = Math.min(fileHandle.position + buf.length, fileHandle.contents.length)
			} else {
				fileHandle.contents[fileHandle.position] = buf
				fileHandle.position++
			}
		}

		fileHandle.modified = true
		fileHandle.meta.modified = Date.now()
	}
	async read(handle: number): Promise<string | number | object> {
		const fileHandle = this.fileHandles[handle]
		if (!fileHandle) {
			throw new Error('Invalid file handle.')
		} else if (fileHandle.mode === FileAccessMode.OUTPUT) {
			throw new Error('Wrong file access mode.')
		}

		let value
		if (typeof fileHandle.contents === 'string') {
			this.csvMatch.lastIndex = fileHandle.position
			const match = this.csvMatch.exec(fileHandle.contents)
			if (match) {
				value = LocalStorageFileSystem.deserializeForRead(match[1])
				fileHandle.position = this.csvMatch.lastIndex
			}
		} else {
			value = fileHandle.contents[fileHandle.position]
			fileHandle.position++
		}
		return value
	}
	async seek(handle: number, pos: number): Promise<void> {
		const fileHandle = this.fileHandles[handle]
		if (!fileHandle) {
			throw new Error('Invalid file handle.')
		} else if (fileHandle.mode === FileAccessMode.OUTPUT) {
			throw new Error('Wrong file access mode.')
		}

		fileHandle.position = pos
	}
	async eof(handle: number): Promise<boolean> {
		const fileHandle = this.fileHandles[handle]
		if (!fileHandle) {
			throw new Error('Invalid file handle.')
		}

		return fileHandle.position >= fileHandle.contents.length
	}
	directory(_fileSpec: string): Promise<string[]> {
		throw new Error('Method not implemented.')
	}
	kill(_fileSpec: string): Promise<void>[] {
		throw new Error('Method not implemented.')
	}
	async access(fileNameOrUri: string): Promise<boolean> {
		// return false if it looks like a URL
		if (fileNameOrUri.match(/^[a-z][\w\+\-]+:\/\//)) {
			return false
		}
		return true
	}
	async getAllContentsBlob(handle: number): Promise<Blob> {
		const fileHandle = this.fileHandles[handle]
		if (!fileHandle) {
			throw new Error('Invalid file handle.')
		} else if (fileHandle.mode !== FileAccessMode.BINARY) {
			throw new Error('Wrong file access mode.')
		}

		const contents = fileHandle.contents
		if (typeof contents === 'string') {
			throw new Error('Wrong file access mode.')
		}

		const contentType = (fileHandle.meta.contentType as string) ?? KNOWN_MIME_TYPES.BINARY

		const data = Uint8Array.from(contents as number[])
		return new Blob([data], { type: contentType })
	}
}
