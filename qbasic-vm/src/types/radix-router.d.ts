declare module 'radix-router' {

	interface Route<T extends Function> {
		path: string
		extraData?: any
		handler: T
	}

	type RouteWithParams<T extends Function> = Route<T> & {
		params?: Record<string, string>
	}

	interface Options<T extends Function> {
		strict?: boolean
		routes?: Route<T>[]
	}

	class RadixRouter<T extends Function> {
		constructor(options?: Options<T>)
		insert(route: Route<T>): void
		lookup(path: string): RouteWithParams<T> | undefined
		remove(path: string): boolean
		startsWith(path: string): Route<T>[]
	}

	export = RadixRouter
}