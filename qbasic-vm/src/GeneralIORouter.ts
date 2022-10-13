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

import { IGeneralIO } from "./IGeneralIO";	
import RadixRouter = require("radix-router");

export type InOutRequest = {
	method: 'in' | 'out'
	params?: Record<string, string>
	data?: string
	path: string
}
export type InOutRouteHandler = (req: InOutRequest) => Promise<string>
export type EventRouteHandler = (data: string) => void

export class GeneralIORouter implements IGeneralIO {
	inOutRouter: RadixRouter<InOutRouteHandler>
	eventsRouter: RadixRouter<EventRouteHandler>
	constructor() {
		this.inOutRouter = new RadixRouter<InOutRouteHandler>()
		this.reset()
	}
	async output(path: string, data: string): Promise<void> {
		const route = this.inOutRouter.lookup(path)
		
		if (route) {
			await route.handler({
				...route,
				method: 'out',
				data: data
			})
		}
	}
	async input(path: string): Promise<string> {
		const route = this.inOutRouter.lookup(path)
		if (route) {
			return route.handler({
				...route,
				method: 'in',
			}) || ''
		}
		return ''
	}
	addEventListener(path: string, handler: (data: string) => void): void {
		this.eventsRouter.remove(path)
		this.eventsRouter.insert({
			path,
			handler,
		})
	}
	removeEventListener(path: string, _handler: (data: string) => void): void {
		this.eventsRouter.remove(path)
	}
	emit(address: string, data: string) {
		const route = this.eventsRouter.lookup(address)
		if (route) {
			route.handler(data)
		}
	}
	insertRoute(path: string, handler: InOutRouteHandler) {
		this.inOutRouter.insert({
			path,
			handler
		})
	}
	removeRoute(path: string): boolean {
		return this.inOutRouter.remove(path)
	}
	reset(): void {
		// only reset the eventsRouter, since that's what hooks into user-code
		// the inOutRouter has routes from the environment, so it should be
		// static
		this.eventsRouter = new RadixRouter<EventRouteHandler>({
			strict: true
		})
	}
} 