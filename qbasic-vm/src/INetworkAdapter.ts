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

export interface IFetchResponse {
	code: number
	body: string
}

export interface INetworkAdapter {
	fetch(
		url: string,
		options: {
			method?: string
			headers?: Record<string, string> | undefined
			body?: string | Blob | Uint8Array
		}
	): Promise<IFetchResponse>
	wsOpen(handle: number, url: string, protocol?: string): Promise<void>
	wsSend(handle: number, data: string): Promise<void>
	wsGetMessageFromBuffer(handle: number): Promise<string | undefined>
	wsClose(handle: number)
	addEventListener(handle: number, listener: () => void): void
	removeEventListener(handle: number, listener: () => void): void

	reset(): Promise<void>
}
